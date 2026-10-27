import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

import { db } from '@/lib/mongodb/db-client';
import type { Project, ProjectGoal, Task } from '@/models/workspace';
import { TASK_STATUS } from '@/models/workspace';

/*
 * Goals pick up the work that fills them. When a task with no goal is done,
 * the goal (or part of one) it delivers towards is found for it: by Gemini,
 * which reads what the goal is for, or by the words of the goal when Gemini
 * is not set up. Each task is looked at once, and a goal someone set or
 * cleared by hand is never changed.
 */

type Fit = { goalId: string; goalPartId: string | null };

const STOP = new Set([
  'and',
  'the',
  'for',
  'with',
  'from',
  'each',
  'every',
  'per',
  'new',
  'more',
  'our',
  'your',
  'day',
  'week',
  'month',
  'daily',
  'weekly',
  'monthly',
]);

const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !/^\d/.test(w) && !STOP.has(w));

/** "post" matches "posted", "short" matches "shorts". */
const sameWord = (a: string, b: string) =>
  a === b ||
  (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a)));

const hits = (want: string[], have: string[]) =>
  want.filter((w) => have.some((h) => sameWord(w, h))).length;

/**
 * The goal a task's title is about, by words: at least half of the goal's
 * words, and for a goal with parts, the part's name too. Null when no goal
 * or more than one fits.
 */
export function goalByWords(title: string, goals: ProjectGoal[]): Fit | null {
  const have = words(title);
  const fits: (Fit & { score: number })[] = [];
  for (const goal of goals) {
    const want = words(goal.title);
    const score = want.length ? hits(want, have) / want.length : 0;
    if (goal.parts?.length) {
      const parts = goal.parts.filter((p) => hits(words(p.label), have) > 0);
      // The part named, and the goal's words or nothing else to go on.
      if (parts.length === 1 && (score >= 0.5 || !want.length))
        fits.push({ goalId: goal.id, goalPartId: parts[0].id, score: 1 });
    } else if (score >= 0.5) {
      fits.push({ goalId: goal.id, goalPartId: null, score });
    }
  }
  fits.sort((a, b) => b.score - a.score);
  if (!fits.length || (fits.length > 1 && fits[0].score === fits[1].score))
    return null;
  return { goalId: fits[0].goalId, goalPartId: fits[0].goalPartId };
}

const geminiKey = () =>
  process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

/** Asks Gemini which goal each task delivers towards; null if it cannot. */
async function goalsByGemini(
  tasks: Task[],
  goals: ProjectGoal[],
): Promise<Map<string, Fit | null> | null> {
  if (!geminiKey()) return null;
  const model = new GoogleGenerativeAI(geminiKey()).getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            task: { type: SchemaType.INTEGER },
            goalId: { type: SchemaType.STRING, nullable: true },
            partId: { type: SchemaType.STRING, nullable: true },
            confidence: { type: SchemaType.NUMBER },
          },
          required: ['task', 'confidence'],
        },
      },
    },
  });
  const prompt = `A project has goals: targets that repeat every day, week or month. Each finished task that directly delivers one unit of a goal counts towards it (one released video for "Release 3 lyric videos a week"). Tasks that only help along the way (a thumbnail, a meeting, a fix) count towards no goal.

Goals (id, title, target, parts as id: label):
${goals
  .map(
    (g) =>
      `- ${g.id} | ${g.title} | ${g.target} a ${g.period}${
        g.parts?.length
          ? ` | parts: ${g.parts.map((p) => `${p.id}: ${p.label}`).join('; ')}`
          : ''
      }`,
  )
  .join('\n')}

Finished tasks:
${tasks.map((t, i) => `${i}. ${t.title}`).join('\n')}

For every task return the goal id it counts towards (and the part id when the goal has parts), or nulls, with your confidence from 0 to 1.`;
  try {
    const result = await model.generateContent(prompt);
    const rows = JSON.parse(result.response.text()) as {
      task: number;
      goalId?: string | null;
      partId?: string | null;
      confidence: number;
    }[];
    const out = new Map<string, Fit | null>(tasks.map((t) => [t.id, null]));
    for (const row of Array.isArray(rows) ? rows : []) {
      const task = tasks[row.task];
      const goal = goals.find((g) => g.id === row.goalId);
      if (!task || !goal || !(row.confidence >= 0.7)) continue;
      const part = goal.parts?.find((p) => p.id === row.partId);
      if (goal.parts?.length && !part) continue;
      out.set(task.id, { goalId: goal.id, goalPartId: part?.id ?? null });
    }
    return out;
  } catch (err) {
    console.error('Goal matching with Gemini failed', err);
    return null;
  }
}

/** Most tasks looked at in one go. */
const MAX_TASKS = 40;

/**
 * Finds the goal of each done task that has none and was not looked at yet
 * (done on or after `since`, when given), and saves it. Returns the tasks as
 * they are now, in the same order.
 */
export async function fitGoals(tasks: Task[], since?: string): Promise<Task[]> {
  const open = tasks
    .filter(
      (t) =>
        t.status === TASK_STATUS.DONE &&
        !t.goalId &&
        !t.goalChecked &&
        (!since ||
          (!!t.completedAt &&
            new Date(t.completedAt as string).toISOString().slice(0, 10) >=
              since)),
    )
    .slice(-MAX_TASKS);
  if (!open.length) return tasks;
  const projectIds = Array.from(new Set(open.map((t) => t.projectId)));
  const projects: Project[] = await db.project.findMany({
    where: { id: { in: projectIds } },
  });
  const updated = new Map<string, Task>();
  for (const project of projects) {
    const goals = project.goals ?? [];
    // No goals yet: looked at again once there are some.
    if (!goals.length) continue;
    const mine = open.filter((t) => t.projectId === project.id);
    const byGemini = await goalsByGemini(mine, goals);
    for (const task of mine) {
      const fit = byGemini
        ? (byGemini.get(task.id) ?? null)
        : goalByWords(task.title, goals);
      updated.set(
        task.id,
        await db.task.update({
          where: { id: task.id },
          data: {
            goalId: fit?.goalId ?? null,
            goalPartId: fit?.goalPartId ?? null,
            goalChecked: true,
          },
        }),
      );
    }
  }
  return tasks.map((t) => updated.get(t.id) ?? t);
}

/** `fitGoals` for one task. */
export const fitGoal = async (task: Task) => (await fitGoals([task]))[0];
