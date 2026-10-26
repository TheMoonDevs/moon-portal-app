/**
 * Booking link defaults, settings checks and the free slots a guest can pick.
 *
 * Client-safe: the settings screen previews with the same rules the server
 * enforces.
 */

import type { MeetProfile, MeetTimeRange } from '@/models/meet';

import {
  addDays,
  dateIn,
  isTimezone,
  isYmd,
  toMinutes,
  weekdayOf,
  zonedTime,
} from './time';

const MINUTE = 60 * 1000;

export const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90];
export const BUFFER_OPTIONS = [0, 5, 10, 15, 30];
export const NOTICE_OPTIONS = [1, 2, 4, 12, 24, 48];
export const WINDOW_OPTIONS = [7, 14, 30, 60];
export const DAILY_LIMIT_OPTIONS = [0, 1, 2, 3, 4, 6, 8];

export const MAX_TITLE = 80;
export const MAX_DESCRIPTION = 500;
export const MAX_NOTE = 1000;
export const MAX_REASON = 500;
export const MAX_DAYS_OFF = 366;

export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const workday = (): MeetTimeRange[] => [{ start: '10:00', end: '18:00' }];

/**
 * A new link: 30 minute meetings on weekdays, 10am to 6pm, with 10 minutes
 * between meetings, at least 12 hours' notice, up to 30 days ahead and no
 * more than four a day. Every request waits for approval.
 */
export const defaultProfile = (
  timezone: string,
): Omit<MeetProfile, 'id' | 'userId' | 'code'> => ({
  isActive: true,
  title: null,
  description: null,
  durationMinutes: 30,
  bufferMinutes: 10,
  minNoticeHours: 12,
  maxDaysAhead: 30,
  dailyLimit: 4,
  timezone: isTimezone(timezone) ? timezone : 'UTC',
  weekly: [[], workday(), workday(), workday(), workday(), workday(), []],
  daysOff: [],
  meetingUrl: null,
  requiresApproval: true,
});

/* -------------------------------- settings ------------------------------- */

const oneOf = (value: unknown, options: number[]) =>
  typeof value === 'number' && options.includes(value);

/** Sorted, non-overlapping ranges, or an error. */
function parseRanges(raw: unknown): MeetTimeRange[] | string {
  if (!Array.isArray(raw)) return [];
  const ranges = raw
    .slice(0, 6)
    .map((r) => ({
      start: String((r as MeetTimeRange)?.start ?? ''),
      end: String((r as MeetTimeRange)?.end ?? ''),
    }))
    .map((r) => ({ ...r, from: toMinutes(r.start), to: toMinutes(r.end) }));
  if (ranges.some((r) => r.from === null || r.to === null))
    return 'Use times like 09:30.';
  if (ranges.some((r) => (r.to as number) <= (r.from as number)))
    return 'Each time range has to end after it starts.';
  ranges.sort((a, b) => (a.from as number) - (b.from as number));
  for (let i = 1; i < ranges.length; i += 1)
    if ((ranges[i].from as number) < (ranges[i - 1].to as number))
      return 'Time ranges on the same day overlap.';
  return ranges.map(({ start, end }) => ({ start, end }));
}

const isMeetingUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

/**
 * The editable settings from an untrusted body. Only keys present are
 * returned, so a partial update works.
 */
export function parseProfileInput(body: Record<string, unknown>): {
  data: Partial<MeetProfile>;
  error: string | null;
} {
  const data: Partial<MeetProfile> = {};
  const text = (value: unknown, max: number) =>
    typeof value === 'string' ? value.trim().slice(0, max) || null : null;

  if ('isActive' in body) data.isActive = !!body.isActive;
  if ('requiresApproval' in body)
    data.requiresApproval = !!body.requiresApproval;
  if ('title' in body) data.title = text(body.title, MAX_TITLE);
  if ('description' in body)
    data.description = text(body.description, MAX_DESCRIPTION);

  const numbers: Array<[keyof MeetProfile, number[], string]> = [
    ['durationMinutes', DURATION_OPTIONS, 'meeting length'],
    ['bufferMinutes', BUFFER_OPTIONS, 'break between meetings'],
    ['minNoticeHours', NOTICE_OPTIONS, 'minimum notice'],
    ['maxDaysAhead', WINDOW_OPTIONS, 'booking window'],
    ['dailyLimit', DAILY_LIMIT_OPTIONS, 'daily limit'],
  ];
  for (const [key, options, label] of numbers) {
    if (!(key in body)) continue;
    if (!oneOf(body[key], options))
      return { data, error: `Choose one of the listed ${label} options.` };
    (data as Record<string, unknown>)[key] = body[key];
  }

  if ('timezone' in body) {
    if (!isTimezone(body.timezone)) return { data, error: 'Unknown timezone.' };
    data.timezone = body.timezone;
  }

  if ('weekly' in body) {
    if (!Array.isArray(body.weekly) || body.weekly.length !== 7)
      return { data, error: 'Send hours for all seven days.' };
    const weekly: MeetTimeRange[][] = [];
    for (const day of body.weekly) {
      const ranges = parseRanges(day);
      if (typeof ranges === 'string') return { data, error: ranges };
      weekly.push(ranges);
    }
    data.weekly = weekly;
  }

  if ('daysOff' in body) {
    const days = Array.isArray(body.daysOff) ? body.daysOff : [];
    data.daysOff = Array.from(new Set(days.filter(isYmd)))
      .sort()
      .slice(-MAX_DAYS_OFF);
  }

  if ('meetingUrl' in body) {
    const url = text(body.meetingUrl, 300);
    if (url && !isMeetingUrl(url))
      return { data, error: 'The meeting link should start with https://.' };
    data.meetingUrl = url;
  }

  return { data, error: null };
}

/* ---------------------------------- slots -------------------------------- */

/** A time already taken on the host's calendar. */
export interface BusyTime {
  start: string;
  end: string;
}

export interface SlotOptions {
  now?: Date;
  /** Ignore the notice period (the host moving a meeting). */
  ignoreNotice?: boolean;
}

/** Slots start on these steps, so a 45 minute meeting can start at :30. */
const stepFor = (duration: number) => Math.min(duration, 30);

/**
 * Every start time a guest can book, as UTC ISO strings in order. A slot is
 * free when it sits inside the weekly hours, isn't on a day off, keeps the
 * buffer around other meetings and the day hasn't reached its limit.
 */
export function freeSlots(
  profile: Pick<
    MeetProfile,
    | 'durationMinutes'
    | 'bufferMinutes'
    | 'minNoticeHours'
    | 'maxDaysAhead'
    | 'dailyLimit'
    | 'timezone'
    | 'weekly'
    | 'daysOff'
  >,
  busy: BusyTime[],
  { now = new Date(), ignoreNotice = false }: SlotOptions = {},
): string[] {
  const tz = isTimezone(profile.timezone) ? profile.timezone : 'UTC';
  const duration = profile.durationMinutes * MINUTE;
  const buffer = profile.bufferMinutes * MINUTE;
  const step = stepFor(profile.durationMinutes);
  const earliest =
    now.getTime() + (ignoreNotice ? 0 : profile.minNoticeHours * 60 * MINUTE);
  const today = dateIn(now, tz);
  const lastDay = addDays(today, profile.maxDaysAhead);
  const daysOff = new Set(profile.daysOff ?? []);

  const taken = busy
    .map((b) => ({
      from: new Date(b.start).getTime(),
      to: new Date(b.end).getTime(),
    }))
    .filter((b) => Number.isFinite(b.from) && Number.isFinite(b.to));
  const perDay = new Map<string, number>();
  for (const b of taken) {
    const day = dateIn(new Date(b.from), tz);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }

  const out: string[] = [];
  for (let day = today; day <= lastDay; day = addDays(day, 1)) {
    if (daysOff.has(day)) continue;
    if (profile.dailyLimit && (perDay.get(day) ?? 0) >= profile.dailyLimit)
      continue;
    for (const range of profile.weekly?.[weekdayOf(day)] ?? []) {
      const from = toMinutes(range.start);
      const to = toMinutes(range.end);
      if (from === null || to === null) continue;
      for (let m = from; m + profile.durationMinutes <= to; m += step) {
        const start = zonedTime(day, m, tz).getTime();
        if (start < earliest) continue;
        const end = start + duration;
        const clashes = taken.some(
          (b) => start < b.to + buffer && end + buffer > b.from,
        );
        if (!clashes) out.push(new Date(start).toISOString());
      }
    }
  }
  return out;
}
