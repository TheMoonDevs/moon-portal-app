import { db } from '@/lib/mongodb/db-client';
import type { SessionUser } from '@/lib/permissions/server';
import {
  lineKey,
  normalizeLine,
  PRIVATE_LINE,
  worklogLines,
} from '@/lib/worklogs/lines';
import type { LinkCandidates } from '@/lib/worklogs/linker';
import { linkCandidates, linkLines } from '@/lib/worklogs/linker';
import { PERSONAL_COMPANY } from '@/lib/worklogs/personal';
import type { PointStatus } from '@/lib/worklogs/timeline';
import type { PointEvent } from '@/lib/worklogs/timeline';
import {
  appendEvents,
  CLAUDE_SECTION_ID,
  eventsFor,
  POINT_STATUSES,
  sectionLines,
  statusOf,
} from '@/lib/worklogs/timeline';
import type { WorklogLink, WorkLogs } from '@/models/worklogs';
import type { WorkLogPoints } from '@/utils/@types/interfaces';
import { LOGLINKTYPE } from '@/utils/@types/interfaces';

/*
 * The "Claude" section of a day's worklog: the lines a person's assistant
 * logs for them through the MCP server, each tagged with where it stands.
 */

export { CLAUDE_SECTION_ID, POINT_STATUSES, statusOf };
export type { PointStatus };

/** A Claude line; a personal one carries the `p:` marker, so only its writer sees it. */
export const formatPoint = (
  text: string,
  status: PointStatus,
  personal = false,
) =>
  `* ${personal ? 'p: ' : ''}${POINT_STATUSES[status].emoji} ${normalizeLine(text)}`;

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
  /** Personal work: private to the person, under their Personal company. */
  personal?: boolean;
  /** Where the point goes when the caller already found its task. */
  place?: { companyId: string; projectId: string; taskId: string | null };
  /** What just happened, added to the point's timeline. */
  note?: string;
  /** An existing point to update (its key or its text), whatever `text` says. */
  point?: string;
  /** A line the person typed themselves for the same work. */
  typedLine?: string;
};

/** Days looked back for an open point carried into today. */
const CARRY_DAYS = 14;

/** Above this many points in a day, log_work nudges towards notes. */
export const POINTS_PER_DAY_HINT = 4;

/**
 * The assistant's point with this key on an earlier day, with its timeline,
 * so work that runs over several days keeps one history.
 */
async function earlierPoint(userId: string, date: string, keys: string[]) {
  const from = new Date(`${date}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - CARRY_DAYS);
  const logs: WorkLogs[] = await db.workLogs.findMany({
    where: {
      userId,
      logType: 'dayLog',
      date: { lt: date, gte: from.toISOString().slice(0, 10) },
    },
    orderBy: { date: 'desc' },
  });
  for (const log of logs) {
    const line = sectionLines(log.works).find(
      (l) => l.claude && keys.includes(l.key),
    );
    if (line)
      return {
        line,
        events: eventsFor(log.timeline as PointEvent[], line.key),
      };
  }
  return null;
}

/** Finds a project or task by id or by name (case and spacing ignored). */
function resolvePlace(point: PointInput, c: LinkCandidates) {
  if (point.place) return point.place;
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
 * A point whose words are already there (or that `point` names) is updated
 * in place, so moving it from doing to done does not add a second line, and
 * each call adds an event to the point's timeline. A point still open on an
 * earlier day brings its history along. Lines are then linked to projects
 * like any other line, and a project or task the assistant named is used as
 * the person's own choice.
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
  let timeline = (existing?.timeline ?? []) as PointEvent[];
  const at = new Date().toISOString();
  // Each point that was waiting on the person and has moved on is a time
  // they guided their assistant.
  let guided = 0;
  let added = 0;
  const results: {
    key: string;
    text: string;
    status: PointStatus;
    updated: boolean;
    personal: boolean;
    startedAt: string;
  }[] = [];
  for (const point of points) {
    const named = point.point?.trim();
    const findLine = (key: string) =>
      lines.findIndex((l) => lineKey(l) === key);
    let index = named
      ? lines.findIndex(
          (l) => lineKey(l) === named || lineKey(l) === lineKey(named),
        )
      : -1;
    if (index < 0) index = findLine(lineKey(point.text));
    let text = index >= 0 ? normalizeLine(lines[index]) : point.text;
    let note = point.note?.trim().slice(0, 300) || undefined;
    // Naming a point and giving new words: the words are what happened.
    if (index >= 0 && named && !note && lineKey(point.text) !== lineKey(text))
      note = normalizeLine(point.text);

    if (index < 0) {
      // Not logged today: carry it over when it was open on an earlier day.
      const keys = [
        lineKey(point.text),
        ...(named ? [named, lineKey(named)] : []),
      ];
      const earlier = await earlierPoint(user.id, date, keys);
      if (earlier) {
        text = earlier.line.text;
        if (earlier.line.isPrivate) point.personal = true;
        const have = new Set(
          eventsFor(timeline, earlier.line.key).map((e) => e.at),
        );
        timeline = appendEvents(
          timeline,
          earlier.events.filter((e) => !have.has(e.at)),
        );
      } else if (named && !point.text) {
        continue;
      }
    }
    point.text = text;
    const key = lineKey(text);
    if (
      index >= 0 &&
      statusOf(lines[index]) === 'waiting' &&
      point.status !== 'waiting'
    )
      guided += 1;
    // A personal point stays personal when its status moves on.
    const personal =
      !!point.personal || (index >= 0 && PRIVATE_LINE.test(lines[index]));
    point.personal = personal;
    const line = formatPoint(text, point.status, personal);
    if (index >= 0) lines[index] = line;
    else {
      lines.push(line);
      added += 1;
    }
    timeline = appendEvents(timeline, [
      { key, at, status: point.status, ...(note && { note }), by: 'claude' },
    ]);
    results.push({
      key,
      text: normalizeLine(text),
      status: point.status,
      updated: index >= 0,
      personal,
      startedAt: eventsFor(timeline, key)[0]?.at ?? at,
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
        data: {
          works: nextWorks,
          guidance: (existing.guidance ?? 0) + guided,
          timeline,
          updatedAt: now,
        },
      })
    : await db.workLogs.create({
        data: {
          ...where,
          title: dayTitle(date),
          works: nextWorks,
          guidance: 0,
          timeline,
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
    if (point.personal) continue;
    const place = resolvePlace(point, candidates);
    if (place) placed.set(lineKey(point.text), place);
  }
  links = links.map((l) => {
    const place = placed.get(l.key);
    return place ? { ...l, ...place, confidence: 1, source: 'user' } : l;
  });
  // A line the person typed for the same work joins the point.
  const typed = sectionLines(nextWorks).filter((l) => !l.claude);
  const linkedTyped: string[] = [];
  for (const point of points) {
    if (!point.typedLine || point.personal) continue;
    const want = lineKey(point.typedLine);
    const words = normalizeLine(point.typedLine).toLowerCase();
    const line =
      typed.find((l) => l.key === want) ??
      typed.find((l) => l.text.toLowerCase().includes(words));
    if (!line || line.isPrivate) continue;
    const key = lineKey(point.text);
    const target = links.find((l) => l.key === key);
    links = links.map((l) =>
      l.key === line.key
        ? {
            ...l,
            sameAs: key,
            companyId: target?.companyId ?? l.companyId,
            projectId: target?.projectId ?? l.projectId,
            taskId: target?.taskId ?? l.taskId,
            confidence: 1,
            source: target?.projectId ? 'user' : l.source,
          }
        : l,
    );
    linkedTyped.push(line.text);
  }
  await db.workLogs.update({ where: { id: saved.id }, data: { links } });

  const total = lines.length;
  return {
    logged: results.map((r) => {
      const link = links.find((l) => l.key === r.key);
      const project = candidates.projects.find((p) => p.id === link?.projectId);
      return {
        ...r,
        project: r.personal ? PERSONAL_COMPANY.name : (project?.name ?? null),
      };
    }),
    ...(linkedTyped.length && { linkedTyped }),
    ...(added > 0 &&
      total > POINTS_PER_DAY_HINT && {
        hint: `This day now has ${total} points. Keep it to a few points per session: one per deliverable. Record rounds, versions and fixes as a note on the existing point (point + note) instead of a new point.`,
      }),
  };
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
  const timeline = (log?.timeline ?? []) as PointEvent[];
  return splitLines(section?.content ?? '').map((l) => {
    const events = eventsFor(timeline, lineKey(l));
    return {
      key: lineKey(l),
      text: normalizeLine(l),
      status: statusOf(l),
      ...(PRIVATE_LINE.test(l) && { personal: true }),
      ...(events.length && {
        startedAt: events[0].at,
        updates: events.length,
      }),
    };
  });
}

/** The lines the person typed themselves for a day (not private ones). */
export async function typedLines(userId: string, date: string) {
  const log: WorkLogs | null = await db.workLogs.findFirst({
    where: { userId, logType: 'dayLog', date },
  });
  const links = (log?.links ?? []) as WorklogLink[];
  return sectionLines(log?.works)
    .filter((l) => !l.claude && !l.isPrivate)
    .map((l) => {
      const sameAs = links.find((k) => k.key === l.key)?.sameAs;
      return { text: l.text, ...(sameAs && { linkedTo: sameAs }) };
    });
}
