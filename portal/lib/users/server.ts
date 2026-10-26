import { getMongoDb } from '@/lib/db/mongoose';
import { db } from '@/lib/mongodb/db-client';

import {
  normalizeSignInCode,
  usernameBase,
  usernameCandidate,
  usernameProblem,
} from './username';

/*
 * Before usernames existed, a user's six-character sign-in code was stored
 * split in two: `username` held its first three characters and `password` the
 * last three, and `username` doubled as their handle.
 *
 * Now the whole code lives in `code`, and `username` is a real, unique,
 * editable handle. A record without `code` is still in the old shape;
 * `ensureUserAccounts` moves those over once per server start, before anyone
 * signs in or is looked up. The old pair is kept in `legacyUsername` and
 * `password` so the move can be undone by hand if ever needed.
 */

const DUPLICATE_KEY = 11000;
const isDuplicateKey = (e: unknown) =>
  (e as { code?: number })?.code === DUPLICATE_KEY;

let accountsReady: Promise<void> | null = null;

/** Run the one-time move to separate usernames (no-op once done). */
export function ensureUserAccounts(): Promise<void> {
  if (!accountsReady) {
    accountsReady = migrateLegacyUsers().catch((e) => {
      // Try again on the next request rather than caching the failure.
      accountsReady = null;
      throw e;
    });
  }
  return accountsReady;
}

async function migrateLegacyUsers() {
  const users = (await getMongoDb()).collection('User');

  // Unique handles, enforced by the database for every migrated record.
  await users
    .createIndex(
      { username: 1 },
      {
        name: 'username_unique',
        unique: true,
        partialFilterExpression: { code: { $exists: true } },
      },
    )
    .catch((e) => console.error('[users] username index', e));

  const legacy = await users
    .find({ code: { $exists: false } })
    .project({ username: 1, password: 1, name: 1, email: 1 })
    .toArray();

  for (const record of legacy) {
    const code = normalizeSignInCode(
      `${record.username ?? ''}${record.password ?? ''}`,
    );
    const base = usernameBase(record.name, record.email);
    for (let attempt = 1; attempt < 1000; attempt++) {
      const username = usernameCandidate(base, attempt);
      if (await usernameTaken(username)) continue;
      try {
        await users.updateOne(
          { _id: record._id, code: { $exists: false } },
          {
            $set: {
              // No code means they could not sign in before either.
              code: code || null,
              username,
              legacyUsername: record.username ?? null,
              updatedAt: new Date(),
            },
          },
        );
        break;
      } catch (e) {
        // Another server took this handle a moment ago; try the next one.
        if (!isDuplicateKey(e)) throw e;
      }
    }
  }
  if (legacy.length) {
    console.info(`[users] moved ${legacy.length} user(s) to usernames`);
  }

  await users
    .createIndex(
      { code: 1 },
      {
        name: 'code_unique',
        unique: true,
        partialFilterExpression: { code: { $type: 'string' } },
      },
    )
    .catch((e) =>
      // Two people sharing a code predates this change; the API still refuses
      // new clashes, and an admin can give one of them a new code.
      console.error('[users] code index (duplicate sign-in codes?)', e),
    );
}

/** Whether another user already has this username. */
export async function usernameTaken(
  username: string,
  exceptUserId?: string,
): Promise<boolean> {
  const found = await db.user.findFirst({ where: { username } });
  return !!found && found.id !== exceptUserId;
}

/** Whether another user already signs in with this code. */
export async function signInCodeTaken(
  code: string,
  exceptUserId?: string,
): Promise<boolean> {
  const found = await db.user.findFirst({ where: { code } });
  return !!found && found.id !== exceptUserId;
}

/** The user who signs in with this code, if any. */
export async function findUserBySignInCode(code: string) {
  await ensureUserAccounts();
  const normalized = normalizeSignInCode(code);
  if (!normalized) return null;
  return db.user.findFirst({ where: { code: normalized } });
}

/** A free username for someone with this name and email. */
export async function suggestUsername(
  name?: string | null,
  email?: string | null,
  exceptUserId?: string,
): Promise<string> {
  const base = usernameBase(name, email);
  for (let attempt = 1; ; attempt++) {
    const candidate = usernameCandidate(base, attempt);
    if (!(await usernameTaken(candidate, exceptUserId))) return candidate;
  }
}

export const USERNAME_TAKEN = 'That username is taken.';

/**
 * Check a username someone asked for. Returns the problem to show them, or
 * null when it is valid and free.
 */
export async function checkUsername(
  username: string,
  exceptUserId?: string,
): Promise<string | null> {
  const problem = usernameProblem(username);
  if (problem) return problem;
  if (await usernameTaken(username, exceptUserId)) return USERNAME_TAKEN;
  return null;
}
