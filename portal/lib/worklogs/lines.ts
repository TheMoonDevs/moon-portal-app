/*
 * Worklog lines: each bullet in a worklog section is one work point. A line's
 * key is a hash of its words (emoji, bullets and the private marker removed),
 * so a link survives ticking a line off or fixing its spacing.
 */

export const PRIVATE_LINE = /^\s*(\*\s*)?p:/i;

export type WorklogLine = {
  key: string;
  text: string;
  isPrivate: boolean;
  /** The section it is in (its `link_id`), e.g. a project's id. */
  section?: string;
};

const hash = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

/** The words of a line, for matching and keys. */
export const normalizeLine = (line: string) =>
  line
    .replace(PRIVATE_LINE, '')
    .replace(/^\s*[*\-+]\s*/, '')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, ' ')
    .replace(/[`*_~>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const lineKey = (line: string) =>
  hash(normalizeLine(line).toLowerCase());

/** Every non-empty line of a worklog's sections. */
export function worklogLines(works: unknown): WorklogLine[] {
  if (!Array.isArray(works)) return [];
  const seen = new Set<string>();
  const out: WorklogLine[] = [];
  for (const work of works) {
    const content = typeof work?.content === 'string' ? work.content : '';
    for (const raw of content.split('\n')) {
      const text = normalizeLine(raw);
      // Skip empty bullets and lines too short to mean anything.
      if (text.replace(/[^\p{L}\p{N}]/gu, '').length < 3) continue;
      const key = lineKey(raw);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        key,
        text,
        isPrivate: PRIVATE_LINE.test(raw),
        section: typeof work?.link_id === 'string' ? work.link_id : undefined,
      });
    }
  }
  return out;
}
