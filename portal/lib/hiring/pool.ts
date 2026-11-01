/**
 * The talent pool: strong people from past openings, kept so the team can
 * ask them again. Someone is in the pool when they carry a pool tag (set on
 * the applicant, by hand or by Claude while screening). Client-safe.
 */
import type { ApplicationTag } from '@/models/hiring';

export const POOL_TAGS: Array<{
  value: ApplicationTag;
  label: string;
  icon: string;
  hint: string;
}> = [
  {
    value: 'TOP',
    label: 'Top pick',
    icon: 'star',
    hint: 'One of the strongest people for this opening.',
  },
  {
    value: 'GENUINE',
    label: 'Sounds genuine',
    icon: 'favorite',
    hint: 'Honest, personal answers, even if the work is thin.',
  },
  {
    value: 'MAYBE',
    label: 'Maybe',
    icon: 'help',
    hint: 'Worth a second look.',
  },
  {
    value: 'KEEP',
    label: 'Keep on file',
    icon: 'inventory_2',
    hint: 'Not this time, but ask them about future openings.',
  },
];

export const isPoolTag = (value: unknown): value is ApplicationTag =>
  POOL_TAGS.some((t) => t.value === value);

/** Known tags from an untrusted list, each once, in the usual order. */
export const sanitizeTags = (value: unknown): ApplicationTag[] => {
  const list = Array.isArray(value) ? value : [];
  return POOL_TAGS.map((t) => t.value).filter((tag) => list.includes(tag));
};

export const tagMeta = (tag: ApplicationTag) =>
  POOL_TAGS.find((t) => t.value === tag);

/** The starter email for someone added to a new opening from the pool. */
export const POOL_TEMPLATE_ID = 'starter:thought-of-you';
