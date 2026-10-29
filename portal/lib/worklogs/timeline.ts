import { lineKey, normalizeLine, PRIVATE_LINE } from './lines';

/*
 * Each work point keeps a timeline: when it started, every status it moved
 * through and the notes added on the way, so the time from start to finish
 * can be shown later. Events live on the day's worklog, keyed by the line's
 * key; a point carried into a later day brings its earlier events along.
 * Kept free of server imports so the worklog screens can use it too.
 */

/** The worklog section the assistant writes its points into. */
export const CLAUDE_SECTION_ID = 'claude';

export const POINT_STATUSES = {
  doing: { emoji: '🟡', label: 'Doing' },
  done: { emoji: '✅', label: 'Done' },
  not_done: { emoji: '❌', label: 'Not done' },
  blocked: { emoji: '🔴', label: 'Blocked' },
  waiting: { emoji: '❓', label: 'Waiting on you' },
} as const;

export type PointStatus = keyof typeof POINT_STATUSES;

/** Marks a line on an earlier day whose work moved on to a later day. */
export const MOVED_EMOJI = '➡️';

/** Marks a point put away unfinished: it stops moving to the next day. */
export const ARCHIVED_EMOJI = '🗄️';

/**
 * Whether a line was moved on to a later day or archived: either way it is
 * not open work on its day any more.
 */
export function setAsideOf(line: string): 'moved' | 'archived' | null {
  const words = line
    .replace(PRIVATE_LINE, '')
    .replace(/^\s*[*\-+]\s*/, '')
    .trimStart();
  if (words.startsWith('➡')) return 'moved';
  if (words.startsWith('🗄')) return 'archived';
  return null;
}

const STATUS_BY_EMOJI = Object.fromEntries(
  Object.entries(POINT_STATUSES).map(([k, v]) => [v.emoji, k]),
) as Record<string, PointStatus>;

/** The status a line is tagged with, from its leading emoji. */
export function statusOf(line: string): PointStatus | null {
  const words = line
    .replace(PRIVATE_LINE, '')
    .replace(/^\s*[*\-+]\s*/, '')
    .trimStart();
  const emoji = Object.keys(STATUS_BY_EMOJI).find((e) => words.startsWith(e));
  return emoji ? STATUS_BY_EMOJI[emoji] : null;
}

export type PointEvent = {
  key: string;
  /** ISO time. */
  at: string;
  status: PointStatus | null;
  /** What happened, e.g. "v6 rendered". */
  note?: string;
  by: 'claude' | 'person';
};

/** Most events kept for one point; the first (its start) is always kept. */
const MAX_EVENTS_PER_POINT = 40;

const FINISHED: (PointStatus | null)[] = ['done', 'not_done'];

/** A point's events, oldest first. */
export const eventsFor = (timeline: PointEvent[] | undefined, key: string) =>
  (timeline ?? [])
    .filter((e) => e.key === key)
    .sort((a, b) => a.at.localeCompare(b.at));

/** When a point started and, if it has, finished. */
export function pointSpan(events: PointEvent[]) {
  if (!events.length) return null;
  const startedAt = events[0].at;
  const last = events[events.length - 1];
  const finishedAt = FINISHED.includes(last.status) ? last.at : null;
  return { startedAt, finishedAt, updates: events.length };
}

/** "2h 15m", "3d 4h", "12m". */
export function formatSpan(fromIso: string, toIso: string) {
  const mins = Math.max(
    0,
    Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 60000),
  );
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h${mins % 60 ? ` ${mins % 60}m` : ''}`;
  const days = Math.floor(hours / 24);
  return `${days}d${hours % 24 ? ` ${hours % 24}h` : ''}`;
}

/** Adds events and trims each point's history to its start and latest ones. */
export function appendEvents(
  timeline: PointEvent[] | undefined,
  events: PointEvent[],
): PointEvent[] {
  const all = [...(timeline ?? []), ...events];
  const counts = new Map<string, number>();
  for (const e of all) counts.set(e.key, (counts.get(e.key) ?? 0) + 1);
  if (![...counts.values()].some((n) => n > MAX_EVENTS_PER_POINT)) return all;
  const seen = new Map<string, number>();
  return all.filter((e) => {
    const index = seen.get(e.key) ?? 0;
    seen.set(e.key, index + 1);
    const total = counts.get(e.key)!;
    return index === 0 || index >= total - (MAX_EVENTS_PER_POINT - 1);
  });
}

/** Every line of a day with its section, for tracking who wrote what. */
export function sectionLines(works: unknown) {
  if (!Array.isArray(works)) return [];
  const out: {
    key: string;
    text: string;
    status: PointStatus | null;
    isPrivate: boolean;
    claude: boolean;
    /** Moved on to a later day, or archived. */
    setAside: 'moved' | 'archived' | null;
  }[] = [];
  const seen = new Set<string>();
  for (const work of works) {
    const content = typeof work?.content === 'string' ? work.content : '';
    for (const raw of content.split('\n')) {
      const text = normalizeLine(raw);
      if (text.replace(/[^\p{L}\p{N}]/gu, '').length < 3) continue;
      const key = lineKey(raw);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        key,
        text,
        status: statusOf(raw),
        isPrivate: PRIVATE_LINE.test(raw),
        claude: work?.link_id === CLAUDE_SECTION_ID,
        setAside: setAsideOf(raw),
      });
    }
  }
  return out;
}

/**
 * Events for lines that are new or whose status changed since the timeline
 * last saw them, e.g. a line the person typed or ticked off in the editor.
 */
export function trackLines(
  works: unknown,
  timeline: PointEvent[] | undefined,
  at = new Date().toISOString(),
): PointEvent[] {
  const last = new Map<string, PointEvent>();
  for (const e of [...(timeline ?? [])].sort((a, b) =>
    a.at.localeCompare(b.at),
  ))
    last.set(e.key, e);
  return sectionLines(works)
    .filter((l) => {
      const seen = last.get(l.key);
      return !seen || seen.status !== l.status;
    })
    .map((l) => ({
      key: l.key,
      at,
      status: l.status,
      by: l.claude ? 'claude' : 'person',
    }));
}
