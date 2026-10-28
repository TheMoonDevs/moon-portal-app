import { HIRING_DIGEST_FREQUENCY } from '@/models/hiring';

/*
 * The choices for how often a hiring lead gets the hiring digest, shared by
 * the digest itself (lib/hiring/digest) and Settings → Hiring preferences.
 */

export const DEFAULT_DIGEST_FREQUENCY = HIRING_DIGEST_FREQUENCY.EVERY_2_DAYS;

export const DIGEST_FREQUENCY_LABELS: Record<HIRING_DIGEST_FREQUENCY, string> =
  {
    DAILY: 'Every morning',
    EVERY_2_DAYS: 'Every 2 days',
    EVERY_3_DAYS: 'Every 3 days',
    WEEKLY: 'Every Monday',
    MONTHLY: 'On the 1st of each month',
    OFF: 'Off',
  };

export const isDigestFrequency = (
  value: unknown,
): value is HIRING_DIGEST_FREQUENCY =>
  Object.values(HIRING_DIGEST_FREQUENCY).includes(
    value as HIRING_DIGEST_FREQUENCY,
  );
