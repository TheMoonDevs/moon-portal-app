import { db } from '@/lib/mongodb/db-client';

import type { Look } from './look';
import { lookOf, parseLook } from './look';

/** Someone's look as it is saved now. */
export async function getLook(userId: string): Promise<Look> {
  const user = await db.user.findFirst({
    where: { id: userId },
    select: { look: true },
  });
  return lookOf(userId, user?.look);
}

/**
 * Changes the parts of someone's look given in `changes`, and keeps the
 * rest. Returns the new look, or the reasons it could not be saved.
 */
export async function saveLook(userId: string, changes: unknown) {
  const { look, errors } = parseLook(changes);
  if (errors.length) return { errors };
  const next: Look = { ...(await getLook(userId)), ...look };
  await db.user.update({
    where: { id: userId },
    data: { look: next, updatedAt: new Date() },
  });
  return { look: next };
}
