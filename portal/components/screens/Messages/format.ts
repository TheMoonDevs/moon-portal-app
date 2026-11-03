import dayjs from 'dayjs';

/** 14:05 */
export const timeOf = (value: string) => dayjs(value).format('HH:mm');

const isToday = (d: dayjs.Dayjs) => d.isSame(dayjs(), 'day');
const isYesterday = (d: dayjs.Dayjs) =>
  d.isSame(dayjs().subtract(1, 'day'), 'day');

/** For the chats list: 14:05, Yesterday, Mon, or 03/11/26. */
export const listTimeOf = (value: string | null) => {
  if (!value) return '';
  const d = dayjs(value);
  if (isToday(d)) return d.format('HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  if (d.isAfter(dayjs().subtract(6, 'day'))) return d.format('ddd');
  return d.format('DD/MM/YY');
};

/** For the date chips between messages: Today, Yesterday, Monday, 3 Nov 2026. */
export const dayLabelOf = (value: string) => {
  const d = dayjs(value);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (d.isAfter(dayjs().subtract(6, 'day'))) return d.format('dddd');
  return d.isSame(dayjs(), 'year')
    ? d.format('D MMMM')
    : d.format('D MMMM YYYY');
};

/** "last seen today at 14:05" */
export const lastSeenText = (value: string | null) => {
  if (!value) return '';
  const d = dayjs(value);
  if (dayjs().diff(d, 'minute') < 2) return 'last seen just now';
  if (isToday(d)) return `last seen today at ${d.format('HH:mm')}`;
  if (isYesterday(d)) return `last seen yesterday at ${d.format('HH:mm')}`;
  return `last seen ${d.format('D MMM')} at ${d.format('HH:mm')}`;
};

export const sizeOf = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export const durationOf = (seconds?: number | null) => {
  if (!seconds && seconds !== 0) return '';
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** A one-line preview of a message for the list and replies. */
export const previewOf = (m: {
  kind: string;
  text: string;
  attachment?: { name: string } | null;
  deletedAt?: string | null;
}) => {
  if (m.deletedAt) return 'This message was deleted';
  const text = m.text.replace(/\s+/g, ' ').trim();
  if (m.kind === 'image') return text ? `📷 ${text}` : '📷 Photo';
  if (m.kind === 'video') return text ? `🎥 ${text}` : '🎥 Video';
  if (m.kind === 'file') return `📄 ${m.attachment?.name || 'File'}`;
  return text;
};

export const newClientId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
