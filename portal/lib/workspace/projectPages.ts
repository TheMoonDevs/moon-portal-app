import type { JsonObject } from '@/models/shared/base';
import { PROJECT_PAGE_KIND } from '@/models/workspace';

/** Largest editor document we keep for one page, as JSON. */
const MAX_CONTENT_BYTES = 400_000;

export const PAGE_KINDS = Object.values(PROJECT_PAGE_KIND);

/** A Tiptap document from an untrusted body; undefined when it is not one. */
export function asPageContent(value: unknown): JsonObject | null | undefined {
  if (value === null) return null;
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    (value as { type?: unknown }).type !== 'doc'
  )
    return undefined;
  if (JSON.stringify(value).length > MAX_CONTENT_BYTES) return undefined;
  return value as JsonObject;
}

export const asPageTitle = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value.trim().slice(0, 200) : fallback;

export const asEmoji = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, 16) : null;

type Nested = { id: string; parentId?: string | null };

/** The pages directly inside `parentId` (the top level when empty). */
export const childPages = <T extends Nested>(
  pages: T[],
  parentId?: string | null,
) => pages.filter((p) => (p.parentId ?? null) === (parentId ?? null));

/** Every page inside `id`, however deep. */
export function descendantIds(pages: Nested[], id: string) {
  const out = new Set<string>();
  const walk = (parent: string) =>
    childPages(pages, parent).forEach((p) => {
      if (out.has(p.id)) return;
      out.add(p.id);
      walk(p.id);
    });
  walk(id);
  return out;
}

/** The pages above `id`, from the top down to its parent. */
export function ancestorPages<T extends Nested>(pages: T[], id: string) {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const out: T[] = [];
  let parent = byId.get(id)?.parentId;
  while (parent && byId.has(parent) && out.length < pages.length) {
    const page = byId.get(parent)!;
    out.unshift(page);
    parent = page.parentId;
  }
  return out;
}
