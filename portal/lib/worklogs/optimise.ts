import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

import { db } from '@/lib/mongodb/db-client';
import type { SessionUser } from '@/lib/permissions/server';
import type { WorklogLink, WorkLogs } from '@/models/worklogs';

import { lineKey } from './lines';
import { linkCandidates } from './linker';
import { MOVED_EMOJI } from './points';
import type { PointStatus } from './timeline';
import { CLAUDE_SECTION_ID, sectionLines } from './timeline';

/**
 * The assistant's lines that moved on to a later day (➡️). Optimise leaves
 * them as they are.
 */
export function movedClaudeLines(works: unknown) {
  const section = Array.isArray(works)
    ? works.find((w) => w?.link_id === CLAUDE_SECTION_ID)
    : null;
  const content: string =
    typeof section?.content === 'string' ? section.content : '';
  return content
    .split('\n')
    .filter((raw) => raw.includes(MOVED_EMOJI) || raw.includes('➡'))
    .map((raw) => ({ raw, key: lineKey(raw) }));
}

/*
 * The worklog's Optimise button: groups a day's many assistant points into a
 * few organised ones. This only plans the groups for a preview; applying a
 * plan goes through tidyPoints, which keeps every merged line as a note.
 */

export type OptimiseGroup = {
  text: string;
  status: PointStatus;
  /** Keys of the points this one replaces. */
  merge: string[];
  /** Their words, for the preview. */
  lines: { key: string; text: string; status: PointStatus | null }[];
  project?: string | null;
};

/** Fewer points than this and there is nothing worth grouping. */
export const MIN_POINTS_TO_OPTIMISE = 3;

/**
 * The group's status from its points: anything waiting on the person comes
 * first, then blocked, then still going; a group of finished points is done
 * if any of them was.
 */
export function groupStatus(statuses: (PointStatus | null)[]): PointStatus {
  for (const s of ['waiting', 'blocked', 'doing'] as PointStatus[])
    if (statuses.includes(s)) return s;
  if (statuses.includes('done')) return 'done';
  if (statuses.includes('not_done')) return 'not_done';
  return 'done';
}

const geminiKey = () =>
  process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

type Line = {
  key: string;
  text: string;
  status: PointStatus | null;
  project: string | null;
};

/** Words before a ":" or the first three words, e.g. "Get into Zone logo". */
const topicOf = (text: string) => {
  const colon = text.indexOf(':');
  const head =
    colon > 3 && colon < 60
      ? text.slice(0, colon)
      : text.split(/\s+/).slice(0, 3).join(' ');
  return head
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .trim();
};

/** Without Gemini: same project and same topic go together. */
function groupByTopic(lines: Line[]): { text: string; keys: string[] }[] {
  const groups = new Map<string, Line[]>();
  for (const line of lines) {
    const id = `${line.project ?? ''}|${topicOf(line.text)}`;
    groups.set(id, [...(groups.get(id) ?? []), line]);
  }
  return Array.from(groups.values()).map((group) => {
    if (group.length === 1)
      return { text: group[0].text, keys: [group[0].key] };
    const colon = group[0].text.indexOf(':');
    const head = colon > 3 && colon < 60 ? group[0].text.slice(0, colon) : null;
    const rests = group.map((l) =>
      head && l.text.startsWith(head)
        ? l.text.slice(head.length + 1).trim()
        : l.text,
    );
    const text = head
      ? `${head}: ${rests.join(', ')}`
      : `${group[0].text} (and ${group.length - 1} more)`;
    return {
      text: text.length > 160 ? `${text.slice(0, 157)}…` : text,
      keys: group.map((l) => l.key),
    };
  });
}

async function groupWithGemini(
  lines: Line[],
): Promise<{ text: string; keys: string[] }[] | null> {
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
            text: { type: SchemaType.STRING },
            lines: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.INTEGER },
            },
          },
          required: ['text', 'lines'],
        },
      },
    },
  });
  const prompt = `These are one day's work log points, logged by an assistant as it worked, so the same deliverable often shows up as many small points (rounds, versions, fixes).
Group them into a few organised points: one per deliverable a person would name in a standup. Only group points about the same deliverable and the same project; a point that stands alone stays alone.
For each group, write one short line (under 140 characters) that says what was made or done, keeping names, versions and PR numbers that matter. Do not mention statuses.
Every point number must be in exactly one group.

Points (number | project | status | text):
${lines.map((l, i) => `${i} | ${l.project ?? '-'} | ${l.status ?? '-'} | ${l.text}`).join('\n')}`;
  try {
    const result = await model.generateContent(prompt);
    const rows = JSON.parse(result.response.text()) as {
      text: string;
      lines: number[];
    }[];
    if (!Array.isArray(rows)) return null;
    const used = new Set<number>();
    const groups: { text: string; keys: string[] }[] = [];
    for (const row of rows) {
      const index = (row.lines ?? []).filter(
        (i) => Number.isInteger(i) && lines[i] && !used.has(i),
      );
      if (!index.length || typeof row.text !== 'string') continue;
      index.forEach((i) => used.add(i));
      groups.push({
        text: row.text.trim().slice(0, 200) || lines[index[0]].text,
        keys: index.map((i) => lines[i].key),
      });
    }
    // Anything the model left out stays as it is.
    lines.forEach((l, i) => {
      if (!used.has(i)) groups.push({ text: l.text, keys: [l.key] });
    });
    return groups;
  } catch (err) {
    console.error('Worklog optimise with Gemini failed', err);
    return null;
  }
}

/**
 * A plan for a day's assistant points: the groups they would become, for
 * the person to look over before anything changes.
 */
export async function planOptimise(user: SessionUser, worklogId: string) {
  const worklog: WorkLogs | null = await db.workLogs.findFirst({
    where: { id: worklogId },
  });
  if (!worklog) return { error: 'Worklog not found.', status: 404 };
  if (worklog.userId !== user.id)
    return { error: 'You can only optimise your own worklog.', status: 403 };

  const links = (worklog.links ?? []) as WorklogLink[];
  const candidates = await linkCandidates(user);
  const projectOf = (key: string) => {
    const id = links.find((l) => l.key === key)?.projectId;
    return candidates.projects.find((p) => p.id === id)?.name ?? null;
  };
  const moved = new Set(movedClaudeLines(worklog.works).map((l) => l.key));
  const lines: Line[] = sectionLines(worklog.works)
    .filter((l) => l.claude && !moved.has(l.key))
    .map((l) => ({
      key: l.key,
      text: l.text,
      status: l.status,
      project: l.isPrivate ? 'Personal' : projectOf(l.key),
    }));
  if (lines.length < MIN_POINTS_TO_OPTIMISE)
    return {
      date: worklog.date,
      before: lines.length,
      groups: [] as OptimiseGroup[],
    };

  const grouped = (await groupWithGemini(lines)) ?? groupByTopic(lines);
  const groups: OptimiseGroup[] = grouped.map((g) => {
    const members = g.keys.map((k) => lines.find((l) => l.key === k)!);
    return {
      text: members.length === 1 ? members[0].text : g.text,
      status: groupStatus(members.map((m) => m.status)),
      merge: g.keys,
      lines: members.map(({ key, text, status }) => ({ key, text, status })),
      project: members[0].project,
    };
  });
  return { date: worklog.date, before: lines.length, groups };
}
