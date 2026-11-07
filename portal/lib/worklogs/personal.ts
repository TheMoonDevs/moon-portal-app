/*
 * Personal work: a personal task and its points belong to their writer
 * alone. Every person has a PERSONAL of their own, a private company with
 * one project in it (lib/workspace/personalSpace), so personal work gets
 * plans, goals, pages and logs like any project. Nobody else ever sees
 * their words or their count: not in leaderboards, stats or the World.
 */

/** What everyone's PERSONAL is called. */
export const PERSONAL_NAME = 'Personal';

/**
 * The made-up company id personal tasks had before everyone got a real
 * PERSONAL. Screens still use it to mean "my PERSONAL"; tasks stored with
 * it move into the real one the next time the person opens the portal.
 */
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

/**
 * What its owner can do in a PERSONAL: everything with its projects,
 * tasks, plans, goals and pages, and naming it. Never adding people,
 * roles, hiring or courses: it is theirs alone.
 */
export const PERSONAL_PERMISSIONS = [
  'companies:read',
  'companies:edit',
  'members:read',
  'roles:read',
  'projects:read',
  'projects:create',
  'projects:edit',
  'projects:delete',
  'projects:approve',
  'tasks:read',
  'tasks:create',
  'tasks:edit',
  'tasks:delete',
];

/** Whether a PERSONAL allows this company permission. */
export const personalAllows = (permission: string) =>
  PERSONAL_PERMISSIONS.includes(permission);
