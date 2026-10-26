import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

import { db } from '@/lib/mongodb/db-client';
import type { SessionUser } from '@/lib/permissions/server';
import { getWorkspaceForUser } from '@/lib/workspace/server';
import type { WorklogLink } from '@/models/worklogs';
import type { Project, Task } from '@/models/workspace';
import { OPEN_TASK_STATUSES, PROJECT_STATUS } from '@/models/workspace';

import type { WorklogLine } from './lines';
import { isPersonalLink, PERSONAL_COMPANY_ID } from './personal';

/** Below this the line is left for the person to place. */
const MIN_CONFIDENCE = 0.6;

export type LinkCandidates = {
  projects: (Pick<Project, 'id' | 'name' | 'companyId' | 'color' | 'logo'> & {
    companyName: string;
    goals: string[];
  })[];
  tasks: Pick<Task, 'id' | 'title' | 'projectId' | 'companyId'>[];
};

/**
 * The projects and open tasks a user's lines may link to: projects in the
 * companies they belong to (and tasks in them, theirs first).
 */
export async function linkCandidates(
  user: SessionUser,
): Promise<LinkCandidates> {
  const workspace = await getWorkspaceForUser(user);
  const mine = workspace.filter((w) => w.member);
  const companies = (mine.length ? mine : workspace).map((w) => w.company);
  if (!companies.length) return { projects: [], tasks: [] };

  const projects: Project[] = await db.project.findMany({
    where: {
      companyId: { in: companies.map((c) => c.id) },
      status: { notIn: [PROJECT_STATUS.ARCHIVED] },
    },
  });
  const tasks: Task[] = projects.length
    ? await db.task.findMany({
        where: {
          projectId: { in: projects.map((p) => p.id) },
          status: { in: OPEN_TASK_STATUSES },
        },
        select: {
          id: true,
          title: true,
          projectId: true,
          companyId: true,
          assigneeIds: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 400,
      })
    : [];
  const sortedTasks = [...tasks].sort(
    (a, b) =>
      Number((b.assigneeIds ?? []).includes(user.id)) -
      Number((a.assigneeIds ?? []).includes(user.id)),
  );

  return {
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      companyId: p.companyId,
      color: p.color,
      logo: p.logo,
      companyName: companies.find((c) => c.id === p.companyId)?.name ?? '',
      goals: (p.goals ?? []).map((g) => g.title),
    })),
    tasks: sortedTasks.slice(0, 150).map((t) => ({
      id: t.id,
      title: t.title,
      projectId: t.projectId,
      companyId: t.companyId,
    })),
  };
}

/* --------------------------------- Matching -------------------------------- */

const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);

const containsPhrase = (text: string, phrase: string) => {
  const p = phrase.trim().toLowerCase();
  if (p.length < 3) return false;
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, 'i').test(text);
};

/** Share of the task title's words that appear in the line. */
const overlap = (line: string, title: string) => {
  const t = words(title);
  if (!t.length) return 0;
  const l = new Set(words(line));
  return t.filter((w) => l.has(w)).length / t.length;
};

type Guess = Omit<WorklogLink, 'key' | 'text' | 'isPrivate'>;

/** Where every private line goes: the person's own Personal company. */
const PERSONAL: Guess = {
  companyId: PERSONAL_COMPANY_ID,
  projectId: null,
  taskId: null,
  confidence: 1,
  source: 'auto',
};

const NONE: Guess = {
  companyId: null,
  projectId: null,
  taskId: null,
  confidence: 0,
  source: 'none',
};

/** Name and task-title matching. Returns null when it cannot tell. */
function matchByName(text: string, c: LinkCandidates): Guess | null {
  const byName = c.projects.filter((p) => containsPhrase(text, p.name));
  const task = c.tasks
    .map((t) => ({ t, score: overlap(text, t.title) }))
    .filter((x) => x.score >= 0.75 && words(x.t.title).length >= 2)
    .sort((a, b) => b.score - a.score)[0];

  if (task && (!byName.length || byName.some((p) => p.id === task.t.projectId)))
    return {
      companyId: task.t.companyId,
      projectId: task.t.projectId,
      taskId: task.t.id,
      confidence: 0.85,
      source: 'auto',
    };
  if (byName.length === 1)
    return {
      companyId: byName[0].companyId,
      projectId: byName[0].id,
      taskId: null,
      confidence: 0.8,
      source: 'auto',
    };
  // Only one place this could go.
  if (c.projects.length === 1)
    return {
      companyId: c.projects[0].companyId,
      projectId: c.projects[0].id,
      taskId: null,
      confidence: 0.7,
      source: 'auto',
    };
  return null;
}

const geminiKey = () =>
  process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

/** Asks Gemini to place the lines name matching could not. */
async function matchWithGemini(
  lines: WorklogLine[],
  c: LinkCandidates,
): Promise<Map<string, Guess>> {
  const out = new Map<string, Guess>();
  if (!lines.length || !c.projects.length || !geminiKey()) return out;

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
            line: { type: SchemaType.INTEGER },
            projectId: { type: SchemaType.STRING, nullable: true },
            taskId: { type: SchemaType.STRING, nullable: true },
            confidence: { type: SchemaType.NUMBER },
          },
          required: ['line', 'confidence'],
        },
      },
    },
  });

  const prompt = `You file a person's work log lines under the project they belong to.
Projects (id, name, company, goals):
${c.projects
  .map(
    (p) =>
      `- ${p.id} | ${p.name} | ${p.companyName}${p.goals.length ? ` | goals: ${p.goals.join('; ')}` : ''}`,
  )
  .join('\n')}
Open tasks (id, project id, title):
${c.tasks.map((t) => `- ${t.id} | ${t.projectId} | ${t.title}`).join('\n') || '- none'}

Work log lines:
${lines.map((l, i) => `${i}. ${l.text}`).join('\n')}

For every line return its project id, the task id if the line is clearly about that task, and your confidence from 0 to 1. Use null and a low confidence when the line is not about any of these projects (for example meetings, admin, personal notes) or when you cannot tell.`;

  try {
    const result = await model.generateContent(prompt);
    const rows = JSON.parse(result.response.text()) as {
      line: number;
      projectId?: string | null;
      taskId?: string | null;
      confidence: number;
    }[];
    for (const row of Array.isArray(rows) ? rows : []) {
      const line = lines[row.line];
      const project = c.projects.find((p) => p.id === row.projectId);
      if (!line || !project || !(row.confidence >= MIN_CONFIDENCE)) continue;
      const task = c.tasks.find(
        (t) => t.id === row.taskId && t.projectId === project.id,
      );
      out.set(line.key, {
        companyId: project.companyId,
        projectId: project.id,
        taskId: task?.id ?? null,
        confidence: Math.min(1, row.confidence),
        source: 'auto',
      });
    }
  } catch (err) {
    // Linking is a helper: on any failure the lines wait for the person.
    console.error('Worklog linking with Gemini failed', err);
  }
  return out;
}

/**
 * Links for the current lines of a worklog. Lines already linked keep their
 * link (and anything the person chose always stays); new lines are matched
 * by name first and by Gemini after. Private lines always go to Personal.
 */
export async function linkLines(
  lines: WorklogLine[],
  existing: WorklogLink[],
  candidates: LinkCandidates,
): Promise<WorklogLink[]> {
  // A line that stopped being private is placed again from scratch.
  const known = new Map(
    existing
      .filter((l) => {
        const line = lines.find((x) => x.key === l.key);
        return !line || line.isPrivate || !isPersonalLink(l);
      })
      .map((l) => [l.key, l]),
  );
  // Private lines are never matched, and never sent to Gemini.
  const fresh = lines.filter((l) => !l.isPrivate && !known.has(l.key));

  const guesses = new Map<string, Guess>();
  const unsure: WorklogLine[] = [];
  for (const line of fresh) {
    const guess = matchByName(line.text, candidates);
    if (guess) guesses.set(line.key, guess);
    else unsure.push(line);
  }
  const fromAi = await matchWithGemini(unsure, candidates);

  return lines.map((line) => {
    if (line.isPrivate)
      return { key: line.key, text: line.text, isPrivate: true, ...PERSONAL };
    const kept = known.get(line.key);
    if (kept) return { ...kept, text: line.text, isPrivate: false };
    const guess = guesses.get(line.key) ?? fromAi.get(line.key) ?? NONE;
    return {
      key: line.key,
      text: line.text,
      isPrivate: false,
      ...guess,
    };
  });
}
