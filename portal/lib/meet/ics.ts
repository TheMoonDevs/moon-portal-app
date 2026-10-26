/**
 * Calendar invites (RFC 5545) for booked meetings. Mail apps show a REQUEST
 * as an invite with Add / Yes / No, and a CANCEL with the same UID removes it.
 */

export interface InviteInput {
  uid: string;
  /** Bumped on every change so calendars take the newest one. */
  sequence: number;
  method: 'REQUEST' | 'CANCEL';
  start: string;
  end: string;
  summary: string;
  description: string;
  location?: string | null;
  url?: string | null;
  organizer: { name: string; email: string };
  attendee: { name: string; email: string };
}

const stamp = (iso: string | Date) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

const escapeText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/([,;])/g, '\\$1');

const quoteParam = (value: string) => `"${value.replace(/["\r\n]/g, '')}"`;

/** Lines longer than 75 octets are folded with a leading space. */
function fold(line: string) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  for (const char of Array.from(line)) {
    const limit = parts.length ? 74 : 75;
    if (Buffer.byteLength(current + char, 'utf8') > limit) {
      parts.push(current);
      current = char;
    } else current += char;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function buildInvite(input: InviteInput): string {
  const cancelled = input.method === 'CANCEL';
  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//The Moon Devs//Portal Meet//EN',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    `METHOD:${input.method}`,
    'BEGIN:VEVENT',
    `UID:${input.uid}`,
    `SEQUENCE:${input.sequence}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(input.start)}`,
    `DTEND:${stamp(input.end)}`,
    `SUMMARY:${escapeText(input.summary)}`,
    `DESCRIPTION:${escapeText(input.description)}`,
    ...(input.location ? [`LOCATION:${escapeText(input.location)}`] : []),
    ...(input.url ? [`URL:${input.url}`] : []),
    `ORGANIZER;CN=${quoteParam(input.organizer.name)}:mailto:${input.organizer.email}`,
    `ATTENDEE;CN=${quoteParam(input.attendee.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=${cancelled ? 'DECLINED' : 'ACCEPTED'};RSVP=FALSE:mailto:${input.attendee.email}`,
    `STATUS:${cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
    'TRANSP:OPAQUE',
    ...(cancelled
      ? []
      : [
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          'DESCRIPTION:Reminder',
          'TRIGGER:-PT10M',
          'END:VALARM',
        ]),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

/** An "Add to Google Calendar" link, for mail apps that ignore invites. */
export function googleCalendarLink(input: {
  start: string;
  end: string;
  summary: string;
  details: string;
  location?: string | null;
}) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.summary,
    dates: `${stamp(input.start)}/${stamp(input.end)}`,
    details: input.details,
    ...(input.location ? { location: input.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
