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
