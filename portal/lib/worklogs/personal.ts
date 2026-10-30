/*
 * Personal work: a personal task and its points belong to their writer
 * alone. Every person has a "Personal" company for them, made up here
 * rather than stored, so personal tasks have somewhere to live. Nobody else
 * ever sees their words or their count: not in leaderboards, stats or the
 * World.
 */

/** The company id of every personal task. */
export const PERSONAL_COMPANY_ID = 'personal';

/**
 * A task written as personal: "p: …", "P - …" or "personal: …" (or
 * "personal - …") at its start.
 */
export const PERSONAL_TITLE =
  /^\s*(?:p\s*:|p\s+[-–—]|p[-–—]\s|personal\s*(?::|[-–—]|$))/i;

/** The Personal company, the same for everyone and visible only to its owner. */
export const PERSONAL_COMPANY = {
  id: PERSONAL_COMPANY_ID,
  name: 'Personal',
  isPersonal: true,
} as const;
