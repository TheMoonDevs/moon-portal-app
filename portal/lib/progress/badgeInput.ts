import { BADGE_METRIC } from '@/models/progress';

/** Validates a badge create or update body. */
export function readBadgeBody(
  body: Record<string, unknown>,
  partial = false,
): { data: Record<string, unknown>; error?: string } {
  const data: Record<string, unknown> = {};
  if (!partial || 'name' in body) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return { data, error: 'Badge name is required.' };
    data.name = name;
  }
  if (!partial || 'metric' in body) {
    if (!Object.values(BADGE_METRIC).includes(body.metric as BADGE_METRIC)) {
      return { data, error: 'Choose what the badge is for.' };
    }
    data.metric = body.metric;
  }
  if (!partial || 'threshold' in body) {
    const threshold = Math.floor(Number(body.threshold));
    if (!Number.isFinite(threshold) || threshold < 1) {
      return { data, error: 'The goal must be 1 or more.' };
    }
    data.threshold = threshold;
  }
  if ('description' in body) data.description = body.description || null;
  if ('imageUrl' in body) data.imageUrl = body.imageUrl || null;
  if ('isActive' in body) data.isActive = !!body.isActive;
  return { data };
}
