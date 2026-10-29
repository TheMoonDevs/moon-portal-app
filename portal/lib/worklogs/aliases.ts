/*
 * Short names a project goes by, so "AMZ - upload thumbnails" lands in
 * Anime Music Zone. A project's own aliases (set on the project) match in
 * any case; its initials match only when written in capitals, so a word
 * like "amz" for Amazon is left alone.
 */

type Named = { name: string; aliases?: string[] | null };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Cleans aliases sent by a person or the assistant: short, unique. */
export function sanitizeAliases(value: unknown): string[] {
  const list = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const alias = item.trim().replace(/\s+/g, ' ').slice(0, 40);
    if (
      alias.replace(/[^\p{L}\p{N}]/gu, '').length >= 2 &&
      !out.some((a) => a.toLowerCase() === alias.toLowerCase())
    )
      out.push(alias);
  }
  return out.slice(0, 10);
}

/** The initials of a name of three words or more, e.g. AMZ. */
export function initialsOf(name: string): string | null {
  const words = name.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (words.length < 3) return null;
  return words.map((w) => w[0].toUpperCase()).join('');
}

/** Whether the text names the project by one of its aliases or initials. */
export function mentionsAlias(text: string, project: Named): boolean {
  const around = (alias: string, flags: string) =>
    new RegExp(
      `(^|[^\\p{L}\\p{N}])${escape(alias)}($|[^\\p{L}\\p{N}])`,
      flags,
    ).test(text);
  if ((project.aliases ?? []).some((a) => around(a, 'iu'))) return true;
  const initials = initialsOf(project.name);
  return !!initials && around(initials, 'u');
}

/** Whether a reference is the project's alias or initials, for lookups. */
export function isAliasOf(ref: string, project: Named): boolean {
  const r = ref.trim();
  if (!r) return false;
  return (
    (project.aliases ?? []).some((a) => a.toLowerCase() === r.toLowerCase()) ||
    initialsOf(project.name) === r
  );
}

/** The names a project goes by, for listing to the assistant. */
export const aliasesOf = (project: Named) =>
  Array.from(
    new Set(
      [...(project.aliases ?? []), initialsOf(project.name)].filter(
        (a): a is string => !!a,
      ),
    ),
  );
