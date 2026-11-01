/**
 * Interview scorecards: the requirements an interviewer rates, read from the
 * opening's screening requirements, and how a scorecard is cleaned before it
 * is saved. Client-safe, so the form and the API share the rules.
 */
import type { ScorecardRating, ScorecardVerdict } from '@/models/hiring';

export const MAX_REQUIREMENTS = 8;
export const MAX_SCORECARD_NOTES = 4000;

export const RATING_LABELS = ['', 'Weak', 'Mixed', 'Good', 'Strong'] as const;

export const VERDICTS: Array<{
  value: ScorecardVerdict;
  label: string;
  tone: 'positive' | 'info' | 'warning' | 'danger';
}> = [
  { value: 'STRONG_YES', label: 'Strong yes', tone: 'positive' },
  { value: 'YES', label: 'Yes', tone: 'info' },
  { value: 'NO', label: 'No', tone: 'warning' },
  { value: 'STRONG_NO', label: 'Strong no', tone: 'danger' },
];

export const verdictMeta = (value: ScorecardVerdict) =>
  VERDICTS.find((v) => v.value === value);

const FALLBACK = ['Skills for the role', 'Communication', 'Initiative'];

/**
 * The lines of the screening requirements worth rating: list items and short
 * lines, without headings like "Must-haves:". Falls back to three general
 * ones when the opening has none.
 */
export function requirementsFromScreening(
  screening: string | null | undefined,
): string[] {
  const lines = (screening ?? '')
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '')
        .replace(/\*\*/g, '')
        .trim(),
    )
    .filter((line) => line && !/[:：]$/.test(line) && !/^#/.test(line))
    .map((line) => (line.length > 120 ? `${line.slice(0, 117)}…` : line));
  const unique = Array.from(new Set(lines)).slice(0, MAX_REQUIREMENTS);
  return unique.length ? unique : FALLBACK;
}

export const isVerdict = (value: unknown): value is ScorecardVerdict =>
  VERDICTS.some((v) => v.value === value);

/** Ratings from an untrusted body: 1 to 4 each, at most eight. */
export function sanitizeRatings(value: unknown): ScorecardRating[] {
  return (Array.isArray(value) ? value : [])
    .slice(0, MAX_REQUIREMENTS)
    .flatMap((item) => {
      const r = (item && typeof item === 'object' ? item : {}) as Record<
        string,
        unknown
      >;
      const requirement =
        typeof r.requirement === 'string' ? r.requirement.trim() : '';
      const rating = Math.round(Number(r.rating));
      if (!requirement || !(rating >= 1 && rating <= 4)) return [];
      return [{ requirement: requirement.slice(0, 160), rating }];
    });
}

/** The mean rating, one decimal, or null with none. */
export const averageRating = (ratings: ScorecardRating[]) =>
  ratings.length
    ? Math.round(
        (ratings.reduce((n, r) => n + r.rating, 0) / ratings.length) * 10,
      ) / 10
    : null;
