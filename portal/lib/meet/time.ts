/**
 * Timezone arithmetic for booking links, with nothing but Intl, so the
 * server and the booking page agree on every slot.
 *
 * Client-safe.
 */

const MINUTE = 60 * 1000;

/** Whether `tz` is an IANA timezone this runtime knows. */
export function isTimezone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The browser's timezone, or UTC. */
export const localTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

/** Every timezone the runtime lists, falling back to a short list. */
export function allTimezones(): string[] {
  try {
    const list = (
      Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
    ).supportedValuesOf?.('timeZone');
    if (list?.length) return list.includes('UTC') ? list : ['UTC', ...list];
  } catch {
    /* older runtime */
  }
  return [
    'UTC',
    'America/Los_Angeles',
    'America/New_York',
    'Europe/London',
    'Europe/Berlin',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Australia/Sydney',
  ];
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>();
const partsIn = (date: Date, tz: string) => {
  let format = partsFormatters.get(tz);
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    partsFormatters.set(tz, format);
  }
  const out: Record<string, number> = {};
  for (const part of format.formatToParts(date))
    if (part.type !== 'literal') out[part.type] = Number(part.value);
  return out;
};

/** Minutes `tz` is ahead of UTC at `date`. */
export function offsetMinutes(date: Date, tz: string) {
  const p = partsIn(date, tz);
  const asUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour % 24,
    p.minute,
    p.second,
  );
  return Math.round(
    (asUtc - (date.getTime() - date.getMilliseconds())) / MINUTE,
  );
}

/** The instant a wall-clock time (`YYYY-MM-DD`, minutes after midnight) happens in `tz`. */
export function zonedTime(ymd: string, minutes: number, tz: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  const wall = Date.UTC(y, m - 1, d, 0, minutes);
  const first = offsetMinutes(new Date(wall), tz);
  const guess = wall - first * MINUTE;
  const second = offsetMinutes(new Date(guess), tz);
  return new Date(second === first ? guess : wall - second * MINUTE);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DD` of `date` in `tz`. */
export function dateIn(date: Date, tz: string) {
  const p = partsIn(date, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Adds days to a `YYYY-MM-DD`. */
export function addDays(ymd: string, days: number) {
  const [y, m, d] = ymd.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/** 0 for Sunday. */
export function weekdayOf(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const isYmd = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

/** `HH:mm` to minutes after midnight, or null. `24:00` is allowed as an end. */
export function toMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? '');
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return Number(match[2]) < 60 && minutes <= 24 * 60 ? minutes : null;
}

/* ------------------------------- formatting ------------------------------ */

/** "Tuesday, 3 November" in `tz`. */
export const formatDay = (date: Date | string, tz: string) =>
  new Date(date).toLocaleDateString('en-GB', {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

/** "10:30 am" in `tz`. */
export const formatTime = (date: Date | string, tz: string) =>
  new Date(date)
    .toLocaleTimeString('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
    })
    .toLowerCase();

/** "GMT+5:30" style label for `tz` at `date`. */
export const timezoneLabel = (tz: string, date: Date | string = new Date()) => {
  try {
    const part = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    })
      .formatToParts(new Date(date))
      .find((p) => p.type === 'timeZoneName');
    return part?.value ?? tz;
  } catch {
    return tz;
  }
};

/** "Tuesday, 3 November 2026, 10:00 am – 10:30 am (Asia/Kolkata, GMT+5:30)". */
export function formatRange(start: string, end: string, tz: string) {
  const year = new Date(start).toLocaleDateString('en-GB', {
    timeZone: tz,
    year: 'numeric',
  });
  return `${formatDay(start, tz)} ${year}, ${formatTime(start, tz)} – ${formatTime(end, tz)} (${tz.replace(/_/g, ' ')}, ${timezoneLabel(tz, start)})`;
}
