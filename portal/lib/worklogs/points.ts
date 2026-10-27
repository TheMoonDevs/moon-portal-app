import { db } from '@/lib/mongodb/db-client';
import type { WorkLogs } from '@/models/worklogs';
import { LOGLINKTYPE } from '@/utils/@types/interfaces';

import { lineKey, normalizeLine } from './lines';
import type { PointEvent, PointStatus } from './timeline';
import {
  appendEvents,
  CLAUDE_SECTION_ID,
  eventsFor,
  POINT_STATUSES,
  statusOf,
} from './timeline';

/*
 * Changing a work point's status from the screens, and carrying points that
 * are still open into the next day. Server only.
 */

/** Marks a line on an earlier day whose work moved on to a later day. */
export const MOVED_EMOJI = '➡️';

/** Open points move on to the next day when their day is over. */
export const OPEN_STATUSES: PointStatus[] = ['doing', 'waiting', 'blocked'];

/** Days looked back for open points to carry into today. */
const CARRY_DAYS = 14;

const STATUS_EMOJI = [
  ...Object.values(POINT_STATUSES).map((s) => s.emoji),
  MOVED_EMOJI,
  '➡',
];

/**
 * The same line with a new status emoji in front. Any status emoji already
 * in it (in front or at the end) is taken out, so a line never carries two.
 */
export function withStatus(raw: string, status: PointStatus | 'moved') {
  const head = raw.match(/^(\s*)([*\-+]\s*)?(p:\s*)?/i);
  const indent = head?.[1] ?? '';
  const bullet = head?.[2] ? head[2].trim() : '*';
  const priv = head?.[3] ? 'p: ' : '';
  let rest = raw.slice(head?.[0].length ?? 0);
  for (const emoji of STATUS_EMOJI) rest = rest.split(emoji).join(' ');
  rest = rest
    .replace(/\uFE0F/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const emoji = status === 'moved' ? MOVED_EMOJI : POINT_STATUSES[status].emoji;
  return `${indent}${bullet} ${priv}${emoji} ${rest}`;
}

type Section = { link_id?: string; content?: string; [k: string]: unknown };

const sectionsOf = (works: unknown): Section[] =>
  Array.isArray(works) ? (works as Section[]) : [];

/** Rewrites the line with `key` in a day's sections; null if it is not there. */
function rewriteLine(
  works: unknown,
  key: string,
  rewrite: (raw: string) => string,
) {
  let found: { raw: string; section: Section } | null = null;
  const next = sectionsOf(works).map((section) => {
    if (found || typeof section?.content !== 'string') return section;
    const lines = section.content.split('\n');
    const index = lines.findIndex((l) => lineKey(l) === key);
    if (index < 0) return section;
    found = { raw: lines[index], section };
    lines[index] = rewrite(lines[index]);
    return { ...section, content: lines.join('\n') };
  });
  return found
    ? { works: next, ...(found as { raw: string; section: Section }) }
    : null;
}

/**
 * Sets one point's status on the person's own worklog, the line's emoji and
 * its timeline both, and returns the saved worklog. Works for lines the
 * person typed and for their assistant's lines alike.
 */
export async function setPointStatus(
  userId: string,
  where: { worklogId?: string; date?: string },
  key: string,
  status: PointStatus,
) {
  const worklog: WorkLogs | null = where.worklogId
    ? await db.workLogs.findFirst({ where: { id: where.worklogId } })
    : await db.workLogs.findFirst({
        where: { userId, logType: 'dayLog', date: where.date },
        orderBy: { updatedAt: 'desc' },
      });
  if (!worklog) return { error: 'That day has no worklog.', status: 404 };
  if (worklog.userId !== userId)
    return { error: 'You can only change your own work points.', status: 403 };

  const changed = rewriteLine(worklog.works, key, (raw) =>
    withStatus(raw, status),
  );
  if (!changed)
    return {
      error: 'That point has changed. Refresh and try again.',
      status: 404,
    };

  const timeline = (worklog.timeline ?? []) as PointEvent[];
  const at = new Date().toISOString();
  const by =
    changed.section.link_id === CLAUDE_SECTION_ID ? 'claude' : 'person';
  const events: PointEvent[] = [];
  // A line never tracked before starts now, so it has a beginning.
  if (!eventsFor(timeline, key).length && statusOf(changed.raw) !== status)
    events.push({ key, at, status: statusOf(changed.raw), by });
  events.push({
    key,
    at: events.length ? new Date(Date.now() + 1).toISOString() : at,
    status,
    note: `Marked ${POINT_STATUSES[status].label.toLowerCase()} by hand`,
    by: 'person',
  });

  const saved: WorkLogs = await db.workLogs.update({
    where: { id: worklog.id },
    data: {
      works: changed.works,
      timeline: appendEvents(timeline, events),
      updatedAt: new Date(),
    },
  });
  return { worklog: saved };
}

const shortDay = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

const dayTitle = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  const month = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const weekday = d.toLocaleString('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  });
  return `${month} ${String(d.getUTCDate()).padStart(2, '0')}  - ${weekday}`;
};

const emptyBullet = (content: string) => content.replace(/[*\s]/g, '') === '';

/**
 * Moves points still open on earlier days into `today`: the line goes into
 * the same section of today's worklog with its history, a note says when it
 * really started, and the earlier day keeps it marked ➡️ (moved on), so it
 * is carried only once. Returns how many points moved.
 */
export async function carryOpenPoints(userId: string, today: string) {
  const from = new Date(`${today}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - CARRY_DAYS);
  const earlier: WorkLogs[] = await db.workLogs.findMany({
    where: {
      userId,
      logType: 'dayLog',
      date: { lt: today, gte: from.toISOString().slice(0, 10) },
    },
    orderBy: { date: 'asc' },
  });
  // Only the latest copy of each day counts.
  const byDate = new Map<string, WorkLogs>();
  for (const log of earlier) {
    const seen = byDate.get(log.date as string);
    if (
      !seen ||
      new Date(log.updatedAt as any) > new Date(seen.updatedAt as any)
    )
      byDate.set(log.date as string, log);
  }

  type Carry = {
    raw: string;
    key: string;
    date: string;
    section: Section;
    events: PointEvent[];
    /** When its day's worklog was first written. */
    dayStart: string;
  };
  const carries: Carry[] = [];
  const touched: { log: WorkLogs; works: Section[] }[] = [];
  for (const log of Array.from(byDate.values())) {
    let changed = false;
    const works = sectionsOf(log.works).map((section) => {
      if (typeof section?.content !== 'string') return section;
      const lines = section.content.split('\n').map((raw) => {
        const status = statusOf(raw);
        if (!status || !OPEN_STATUSES.includes(status)) return raw;
        if (normalizeLine(raw).replace(/[^\p{L}\p{N}]/gu, '').length < 3)
          return raw;
        const key = lineKey(raw);
        // The latest open copy wins when the same work was open on two days.
        const at = carries.findIndex((c) => c.key === key);
        if (at >= 0) carries.splice(at, 1);
        carries.push({
          raw,
          key,
          date: log.date as string,
          section,
          events: eventsFor(log.timeline as PointEvent[], key),
          dayStart: log.createdAt
            ? new Date(log.createdAt as any).toISOString()
            : `${log.date}T00:00:00.000Z`,
        });
        changed = true;
        return withStatus(raw, 'moved');
      });
      return { ...section, content: lines.join('\n') };
    });
    if (changed) touched.push({ log, works });
  }
  if (!carries.length) return { moved: 0 };

  const existing: WorkLogs | null = await db.workLogs.findFirst({
    where: { userId, logType: 'dayLog', date: today },
    orderBy: { updatedAt: 'desc' },
  });
  let works = sectionsOf(existing?.works).map((s) => ({ ...s }));
  if (!works.length)
    works = [
      {
        link_type: LOGLINKTYPE.GENERAL,
        link_id: 'general',
        title: 'General',
        icon: 'work',
        content: '* ',
      },
    ];
  let timeline = (existing?.timeline ?? []) as PointEvent[];
  const at = new Date().toISOString();
  const have = new Set(
    works.flatMap((s) =>
      typeof s.content === 'string' ? s.content.split('\n').map(lineKey) : [],
    ),
  );
  let moved = 0;
  for (const carry of carries) {
    // Already on today (e.g. logged again): only its history comes along.
    if (!have.has(carry.key)) {
      let index = works.findIndex((s) => s.link_id === carry.section.link_id);
      if (index < 0) {
        works.push({ ...carry.section, content: '' });
        index = works.length - 1;
      }
      const content = works[index].content ?? '';
      works[index] = {
        ...works[index],
        content: emptyBullet(content)
          ? carry.raw
          : `${content.replace(/\n+$/, '')}\n${carry.raw}`,
      };
      have.add(carry.key);
      moved += 1;
    } else if (
      eventsFor(timeline, carry.key).some((e) =>
        e.note?.startsWith('Carried over'),
      )
    )
      continue;
    const seen = new Set(eventsFor(timeline, carry.key).map((e) => e.at));
    const history = carry.events.filter((e) => !seen.has(e.at));
    const startedAt = [...history, ...eventsFor(timeline, carry.key)].sort(
      (a, b) => a.at.localeCompare(b.at),
    )[0]?.at;
    const started = startedAt
      ? new Date(startedAt).toISOString().slice(0, 10)
      : carry.date;
    timeline = appendEvents(timeline, [
      // A line never tracked before started on its own day.
      ...(history.length || startedAt
        ? history
        : [
            {
              key: carry.key,
              at: carry.dayStart,
              status: statusOf(carry.raw),
              note: 'Started',
              by:
                carry.section.link_id === CLAUDE_SECTION_ID
                  ? ('claude' as const)
                  : ('person' as const),
            },
          ]),
      {
        key: carry.key,
        at,
        status: statusOf(carry.raw),
        note: `Carried over from ${shortDay(carry.date)}, started ${shortDay(started)}`,
        by: carry.section.link_id === CLAUDE_SECTION_ID ? 'claude' : 'person',
      },
    ]);
  }

  const now = new Date();
  if (existing)
    await db.workLogs.update({
      where: { id: existing.id },
      data: { works, timeline, updatedAt: now },
    });
  else
    await db.workLogs.create({
      data: {
        userId,
        logType: 'dayLog',
        date: today,
        title: dayTitle(today),
        works,
        timeline,
        createdAt: now,
        updatedAt: now,
      },
    });
  // Earlier days keep their time of last edit.
  for (const { log, works: next } of touched)
    await db.workLogs.update({
      where: { id: log.id },
      data: { works: next },
    });
  return { moved };
}
