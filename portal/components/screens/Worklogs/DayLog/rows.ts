import { lineKey, normalizeLine, PRIVATE_LINE } from '@/lib/worklogs/lines';
import type { PointStatus } from '@/lib/worklogs/timeline';
import {
  CLAUDE_SECTION_ID,
  POINT_STATUSES,
  statusOf,
} from '@/lib/worklogs/timeline';
import type { WorkLogPoints } from '@/utils/@types/interfaces';
import { LOGLINKTYPE } from '@/utils/@types/interfaces';

/*
 * The worklog page edits a day as rows, one per line, while the day is still
 * stored as markdown sections (so older screens, the digest and the assistant
 * keep working). A row that was not touched is written back exactly as it was
 * read, so nothing in a line is ever lost to the editor.
 */

/** Marks a line on an earlier day whose work moved on to a later day. */
const MOVED = '➡️';

export type RowStatus = PointStatus | 'moved' | null;

export type Row = {
  /** Stable while the page is open, unlike the key. */
  id: string;
  /** The section's `link_id`: general, claude, or a project's id. */
  section: string;
  text: string;
  status: RowStatus;
  isPrivate: boolean;
  claude: boolean;
  /** The line as read; written back as it is until the row is edited. */
  raw: string | null;
  /** Its key when the server last saw it, to carry a rewording over. */
  syncedKey: string | null;
  /** Spaces in front, for a line nested under another. */
  indent: string;
  /**
   * A line with no words (a divider, a lone emoji): kept where it was and
   * written back, but not shown.
   */
  filler?: boolean;
  /** Where a new row should go once it is saved. */
  place?: { companyId: string } | null;
};

let seq = 0;
export const newRowId = () =>
  `r${Date.now().toString(36)}${(seq++).toString(36)}`;

const leadingStatus = (raw: string): RowStatus => {
  const words = raw
    .replace(PRIVATE_LINE, '')
    .replace(/^\s*[*\-+]\s*/, '')
    .trimStart();
  if (words.startsWith(MOVED) || words.startsWith('➡')) return 'moved';
  return statusOf(raw);
};

/** The words of a line without its bullet, private marker or status. */
const wordsOf = (raw: string) => {
  let rest = raw
    .replace(PRIVATE_LINE, '')
    .replace(/^\s*[*\-+]\s*/, '')
    .trimStart();
  for (const emoji of [
    ...Object.values(POINT_STATUSES).map((s) => s.emoji),
    MOVED,
    '➡',
  ])
    if (rest.startsWith(emoji)) rest = rest.slice(emoji.length);
  return rest.replace(/^️/, '').trim();
};

/** Nothing at all: a blank line or an empty bullet. */
const isBlank = (raw: string) => /^\s*([*\-+]\s*)?$/.test(raw);

/** A line with no words to show, e.g. a divider. */
const isWordless = (raw: string) =>
  normalizeLine(raw).replace(/[^\p{L}\p{N}]/gu, '').length === 0;

export function toRows(works: unknown): Row[] {
  if (!Array.isArray(works)) return [];
  const rows: Row[] = [];
  for (const work of works as WorkLogPoints[]) {
    const content = typeof work?.content === 'string' ? work.content : '';
    for (const raw of content.split('\n')) {
      if (isBlank(raw)) continue;
      rows.push({
        filler: isWordless(raw),
        indent: raw.match(/^\s*/)?.[0] ?? '',
        id: newRowId(),
        section: work.link_id,
        text: wordsOf(raw),
        status: leadingStatus(raw),
        isPrivate: PRIVATE_LINE.test(raw),
        claude: work.link_id === CLAUDE_SECTION_ID,
        raw,
        syncedKey: lineKey(raw),
      });
    }
  }
  return rows;
}

/** The markdown line for a row: its original line when it is untouched. */
export function rowLine(row: Row) {
  if (row.raw !== null) return row.raw;
  const emoji =
    row.status === 'moved'
      ? MOVED
      : row.status
        ? POINT_STATUSES[row.status].emoji
        : '';
  return `${row.indent}* ${row.isPrivate ? 'p: ' : ''}${emoji ? `${emoji} ` : ''}${row.text.trim()}`;
}

export const rowKey = (row: Row) => lineKey(rowLine(row));

/** Whether a row is long enough to be saved as a point. */
export const isPoint = (row: Row) =>
  row.text.replace(/[^\p{L}\p{N}]/gu, '').length >= 3;

/**
 * The day's sections with the rows written back in. Sections keep their
 * order, titles and fields; the assistant's section is passed through as
 * loaded (the server keeps its latest copy anyway), and new project sections
 * are added for rows written under a project.
 */
export function toWorks(
  base: unknown,
  rows: Row[],
  sectionTitle: (id: string) => string,
): WorkLogPoints[] {
  const sections: WorkLogPoints[] = Array.isArray(base)
    ? (base as WorkLogPoints[]).map((s) => ({ ...s }))
    : [];
  if (!sections.some((s) => s.link_id === 'general'))
    sections.unshift({
      link_type: LOGLINKTYPE.GENERAL,
      link_id: 'general',
      title: 'General',
      icon: 'work',
      content: '* ',
    });
  for (const row of rows)
    if (!sections.some((s) => s.link_id === row.section))
      sections.push({
        link_type: LOGLINKTYPE.PROJECT,
        link_id: row.section,
        title: sectionTitle(row.section),
        icon: 'work',
        content: '',
      });
  return sections.map((section) => {
    if (section.link_id === CLAUDE_SECTION_ID) return section;
    const lines = rows
      .filter((r) => r.section === section.link_id && !r.claude)
      .filter((r) => r.raw !== null || r.text.trim())
      .map(rowLine);
    return { ...section, content: lines.length ? lines.join('\n') : '* ' };
  });
}
