import { db } from '@/lib/mongodb/db-client';
import type { SessionUser } from '@/lib/permissions/server';
import { lineKey, normalizeLine, worklogLines } from '@/lib/worklogs/lines';
import type { LinkCandidates } from '@/lib/worklogs/linker';
import { linkCandidates, linkLines } from '@/lib/worklogs/linker';
import type { WorklogLink, WorkLogs } from '@/models/worklogs';
import type { WorkLogPoints } from '@/utils/@types/interfaces';
import { LOGLINKTYPE } from '@/utils/@types/interfaces';

/*
 * The "Claude" section of a day's worklog: the lines a person's assistant
 * logs for them through the MCP server, each tagged with where it stands.
 */

export const CLAUDE_SECTION_ID = 'claude';

export const POINT_STATUSES = {
  doing: { emoji: '🟡', label: 'Doing' },
  done: { emoji: '✅', label: 'Done' },
  not_done: { emoji: '❌', label: 'Not done' },
  blocked: { emoji: '🔴', label: 'Blocked' },
  waiting: { emoji: '❓', label: 'Waiting on you' },
} as const;

export type PointStatus = keyof typeof POINT_STATUSES;

const STATUS_BY_EMOJI = Object.fromEntries(
  Object.entries(POINT_STATUSES).map(([k, v]) => [v.emoji, k]),
) as Record<string, PointStatus>;

/** The status a line is tagged with, from its leading emoji. */
export function statusOf(line: string): PointStatus | null {
  const emoji = Object.keys(STATUS_BY_EMOJI).find((e) =>
    line.replace(/^\s*[*\-+]\s*/, '').startsWith(e),
  );
  return emoji ? STATUS_BY_EMOJI[emoji] : null;
}

export const formatPoint = (text: string, status: PointStatus) =>
  `* ${POINT_STATUSES[status].emoji} ${normalizeLine(text)}`;

const emptySection = (): WorkLogPoints => ({
  link_type: LOGLINKTYPE.GENERAL,
  link_id: CLAUDE_SECTION_ID,
  title: 'Claude',
  icon: 'smart_toy',
  content: '',
});

const splitLines = (content: string) =>
  content.split('\n').filter((l) => l.replace(/[*\s]/g, '').length > 0);

/**
 * Keeps the assistant's latest lines when the editor saves an older copy of
 * the day: a line the assistant updated keeps its new status, and a line it
 * added since the editor loaded is kept.
 */
export function keepClaudeSection(incoming: unknown, stored: unknown): unknown {
  if (!Array.isArray(incoming) || !Array.isArray(stored)) return incoming;
  const saved = stored.find((w) => w?.link_id === CLAUDE_SECTION_ID);
  if (!saved?.content) return incoming;
  const index = incoming.findIndex((w) => w?.link_id === CLAUDE_SECTION_ID);
  const current: WorkLogPoints =
    index >= 0 ? incoming[index] : { ...saved, content: '' };

  const savedLines = splitLines(saved.content);
  const byKey = new Map(savedLines.map((l) => [lineKey(l), l]));
  const lines = splitLines(current.content ?? '').map(
    (l) => byKey.get(lineKey(l)) ?? l,
  );
  const have = new Set(lines.map(lineKey));
  for (const l of savedLines) if (!have.has(lineKey(l))) lines.push(l);

  const merged = { ...current, content: lines.join('\n') };
  return index >= 0
    ? incoming.map((w, i) => (i === index ? merged : w))
    : [...incoming, merged];
}

/** Today's date for a person, in their timezone when they set one. */
export function todayFor(timezone?: string | null) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

const dayTitle = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  const month = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const weekday = d.toLocaleString('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  });
  return `${month} ${String(d.getUTCDate()).padStart(2, '0')}  - ${weekday}`;
};

export type PointInput = {
  text: string;
  status: PointStatus;
  project?: string;
  task?: string;
};

/** Finds a project or task by id or by name (case and spacing ignored). */
function resolvePlace(point: PointInput, c: LinkCandidates) {
  const same = (a: string, b: string) =>
    a.trim().toLowerCase() === b.trim().toLowerCase();
  const task = point.task
    ? c.tasks.find((t) => t.id === point.task || same(t.title, point.task!))
    : undefined;
  const project = point.project
    ? c.projects.find(
        (p) => p.id === point.project || same(p.name, point.project!),
      )
    : c.projects.find((p) => p.id === task?.projectId);
  if (!project) return null;
  return {
    companyId: project.companyId,
    projectId: project.id,
    taskId: task && task.projectId === project.id ? task.id : null,
  };
}

/**
 * Writes points into the Claude section of the person's worklog for `date`.
 * A point whose words are already there is updated in place (so moving it
 * from doing to done does not add a second line). Lines are then linked to
 * projects like any other line, and a project or task the assistant named
 * is used as the person's own choice.
 */
export async function logPoints(
  user: SessionUser,
  points: PointInput[],
  date: string,
) {
  const where = { userId: user.id, logType: 'dayLog', date };
  const existing: WorkLogs | null = await db.workLogs.findFirst({ where });
  const works: WorkLogPoints[] = Array.isArray(existing?.works)
    ? (existing!.works as unknown as WorkLogPoints[])
    : [];
  const section =
    works.find((w) => w?.link_id === CLAUDE_SECTION_ID) ?? emptySection();

  const lines = splitLines(section.content ?? '');
  const results: { text: string; status: PointStatus; updated: boolean }[] = [];
  for (const point of points) {
    const line = formatPoint(point.text, point.status);
    const key = lineKey(line);
    const at = lines.findIndex((l) => lineKey(l) === key);
    if (at >= 0) lines[at] = line;
    else lines.push(line);
    results.push({
      text: normalizeLine(point.text),
      status: point.status,
      updated: at >= 0,
    });
  }

  const nextSection = { ...section, content: lines.join('\n') };
  const hasSection = works.some((w) => w?.link_id === CLAUDE_SECTION_ID);
  const nextWorks = hasSection
    ? works.map((w) => (w?.link_id === CLAUDE_SECTION_ID ? nextSection : w))
    : [
        // A new day starts with the usual General section for the person.
        ...(works.length
          ? works
          : [
              {
                link_type: LOGLINKTYPE.GENERAL,
                link_id: 'general',
                title: 'General',
                icon: 'work',
                content: '* ',
              },
            ]),
        nextSection,
      ];

  const now = new Date();
  const saved: WorkLogs = existing
    ? await db.workLogs.update({
        where: { id: existing.id },
        data: { works: nextWorks, updatedAt: now },
      })
    : await db.workLogs.create({
        data: {
          ...where,
          title: dayTitle(date),
          works: nextWorks,
          createdAt: now,
          updatedAt: now,
        },
      });

  // Link the lines to projects, honouring what the assistant said.
  const candidates = await linkCandidates(user);
  let links = await linkLines(
    worklogLines(nextWorks),
    (existing?.links ?? []) as WorklogLink[],
    candidates,
  );
  const placed = new Map<string, ReturnType<typeof resolvePlace>>();
  for (const point of points) {
    const place = resolvePlace(point, candidates);
    if (place) placed.set(lineKey(point.text), place);
  }
  links = links.map((l) => {
    const place = placed.get(l.key);
    return place ? { ...l, ...place, confidence: 1, source: 'user' } : l;
  });
  await db.workLogs.update({ where: { id: saved.id }, data: { links } });

  return results.map((r) => {
    const link = links.find((l) => l.key === lineKey(r.text));
    const project = candidates.projects.find((p) => p.id === link?.projectId);
    return { ...r, project: project?.name ?? null };
  });
}

/** The assistant's lines for a day, with their status. */
export async function claudeLines(userId: string, date: string) {
  const log: WorkLogs | null = await db.workLogs.findFirst({
    where: { userId, logType: 'dayLog', date },
  });
  const section = Array.isArray(log?.works)
    ? (log!.works as unknown as WorkLogPoints[]).find(
        (w) => w?.link_id === CLAUDE_SECTION_ID,
      )
    : undefined;
  return splitLines(section?.content ?? '').map((l) => ({
    text: normalizeLine(l),
    status: statusOf(l),
  }));
}
