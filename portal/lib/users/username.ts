/**
 * Usernames are the public handle people see and type (`@jane`). They are
 * separate from the six-character sign-in code, which stays private.
 *
 * Rules: 3–20 characters, lower-case letters, digits and underscores, starting
 * with a letter. Stored lower-cased, so uniqueness is case-insensitive.
 *
 * This file is shared by the browser and the server; keep it free of
 * server-only imports.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;

/** Handles that would read as the portal itself, or clash with routes. */
const RESERVED = new Set([
  'admin',
  'administrator',
  'api',
  'app',
  'apply',
  'claude',
  'help',
  'login',
  'logout',
  'me',
  'moderator',
  'null',
  'oauth',
  'portal',
  'root',
  'settings',
  'staff',
  'support',
  'system',
  'undefined',
  'user',
  'users',
]);

/** Trim, drop a leading `@` and lower-case what someone typed. */
export const normalizeUsername = (value: unknown): string =>
  typeof value === 'string'
    ? value.trim().replace(/^@+/, '').toLowerCase()
    : '';

/** Why a (normalized) username cannot be used, or null when it is fine. */
export function usernameProblem(username: string): string | null {
  if (!username) return 'Pick a username.';
  if (username.length < USERNAME_MIN)
    return `Use at least ${USERNAME_MIN} characters.`;
  if (username.length > USERNAME_MAX)
    return `Use at most ${USERNAME_MAX} characters.`;
  if (!/^[a-z]/.test(username)) return 'Start with a letter.';
  if (!USERNAME_PATTERN.test(username))
    return 'Use only letters, numbers and underscores.';
  if (RESERVED.has(username)) return 'That username is reserved.';
  return null;
}

/**
 * A starting point for someone's username, from their name or email
 * (`Jane Doe` → `jane`, `jane.doe@x.com` → `jane_doe`). It may be taken;
 * callers add a number until it is free.
 */
export function usernameBase(
  name?: string | null,
  email?: string | null,
): string {
  const clean = (value: string) =>
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^[^a-z]+/, '')
      .replace(/_+$/, '');

  const words = clean(name ?? '')
    .split('_')
    .filter(Boolean);
  const fromEmail = clean((email ?? '').split('@')[0] ?? '');

  const fits = (value: string) =>
    value.length >= USERNAME_MIN && !RESERVED.has(value);
  return (
    [
      words[0],
      // A very short first name reads better with the next word: "jo_ng".
      words[1] && `${words[0]}_${words[1]}`,
      fromEmail,
    ]
      .filter((value): value is string => !!value)
      // Leave room for a numeric suffix.
      .map((value) => value.slice(0, USERNAME_MAX - 3).replace(/_+$/, ''))
      .find(fits) ?? 'member'
  );
}

/** `jane`, `jane2`, `jane3`, … — the n-th candidate for a base. */
export const usernameCandidate = (base: string, attempt: number): string =>
  attempt <= 1 ? base : `${base}${attempt}`;

/** Sign-in codes: six letters or digits, stored upper-cased. */
export const normalizeSignInCode = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toUpperCase() : '';

export const isValidSignInCode = (code: string): boolean =>
  /^[A-Z0-9]{6}$/.test(code);
