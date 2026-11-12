import { createHash, timingSafeEqual } from 'crypto';

import { LOGIN_ERRORS } from '@/lib/auth/loginErrors';
import { SignInError } from '@/lib/auth/signIn';
import { db } from '@/lib/mongodb/db-client';
import { ensureUserAccounts } from '@/lib/users/server';
import { normalizeSignInCode, TEST_SIGN_IN_CODE } from '@/lib/users/username';

/*
 * Test sign-in for the App Store and Google Play reviewers, who can't sign in
 * with our Google accounts. In the app they type the code TEST12, then an
 * email and password. It signs in exactly one Portal account:
 *
 *   MOBILE_TEST_EMAIL     the email of an existing Portal user, best a
 *                         reviewer account in a demo company
 *   MOBILE_TEST_PASSWORD  its password for this sign-in only (long, random)
 *
 * Both are server-only environment variables; without them the test sign-in
 * is off. Like Sign in with Apple, it never gives super-admin powers.
 */

const digest = (value: string) => createHash('sha256').update(value).digest();
/** Compares without leaking where the two differ, or their lengths. */
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

/* Best-effort throttle on wrong passwords (in this server's memory). */
const failures = new Map<string, number[]>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_ADDRESS = 5;
const MAX_OVERALL = 30;

const recentFailures = (key: string) => {
  const now = Date.now();
  const times = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  failures.set(key, times);
  return times;
};

const noteFailure = (clientKey: string) => {
  for (const key of [clientKey, '*']) recentFailures(key).push(Date.now());
  if (failures.size > 5000) {
    for (const [key, times] of Array.from(failures.entries()))
      if (!times.some((t) => Date.now() - t < WINDOW_MS)) failures.delete(key);
  }
};

export async function verifyTestSignIn(input: {
  code: unknown;
  email: unknown;
  password: unknown;
  clientKey: string;
}) {
  const email = process.env.MOBILE_TEST_EMAIL?.trim();
  const password = process.env.MOBILE_TEST_PASSWORD;
  if (!email || !password) throw new SignInError(LOGIN_ERRORS.TEST_OFF);
  if (normalizeSignInCode(input.code) !== TEST_SIGN_IN_CODE)
    throw new SignInError(LOGIN_ERRORS.INVALID_CODE);
  if (
    recentFailures(input.clientKey).length >= MAX_PER_ADDRESS ||
    recentFailures('*').length >= MAX_OVERALL
  )
    throw new SignInError(LOGIN_ERRORS.TOO_MANY_TRIES);

  const sentEmail =
    typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const sentPassword = typeof input.password === 'string' ? input.password : '';
  // Check both every time, so the answer takes as long either way.
  const emailOk = same(sentEmail, email.toLowerCase());
  const passwordOk = same(sentPassword, password);
  if (!emailOk || !passwordOk) {
    noteFailure(input.clientKey);
    throw new SignInError(LOGIN_ERRORS.WRONG_PASSWORD);
  }

  await ensureUserAccounts();
  const user =
    (await db.user.findFirst({ where: { email: email.toLowerCase() } })) ??
    (email !== email.toLowerCase()
      ? await db.user.findFirst({ where: { email } })
      : null);
  if (!user) throw new SignInError(LOGIN_ERRORS.TEST_NO_ACCOUNT);
  if (user.status && user.status !== 'ACTIVE')
    throw new SignInError(LOGIN_ERRORS.INACTIVE);
  return { user };
}
