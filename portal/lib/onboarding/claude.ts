import { db } from '@/lib/mongodb/db-client';

/** Why someone cannot connect Claude yet. */
export const CLAUDE_LOCKED_MESSAGE =
  'Claude opens once you are fully hired. Until then, use the Portal directly.';

/**
 * Whether a new hire is still onboarding or on trial, when Claude
 * connections (MCP tokens and app connections) are not allowed.
 */
export async function isClaudeLocked(userId: string): Promise<boolean> {
  const user = await db.user.findFirst({
    where: { id: userId },
    select: { claudeLocked: true },
  });
  return !!user?.claudeLocked;
}
