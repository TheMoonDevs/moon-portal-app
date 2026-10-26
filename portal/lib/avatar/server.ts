import { db } from '@/lib/mongodb/db-client';
import { worklogPoints } from '@/lib/progress/buff';

import type { Look, LookLock } from './look';
import {
  lockMessage,
  LOOK_LOCK_DAYS,
  LOOK_UNLOCK_POINTS,
  lookOf,
  parseLook,
  styled,
} from './look';

const DAY = 24 * 60 * 60 * 1000;

/** Work points (worklog lines and task points) earned after `day`. */
async function pointsAfter(userId: string, day: string) {
  const [logs, entries] = await Promise.all([
    db.workLogs.findMany({
      where: { userId, logType: 'dayLog', date: { gt: day } },
      select: { works: true },
    }),
    db.pointEntry.findMany({
      where: { userId, date: { gt: day } },
      select: { points: true },
    }),
  ]);
  return (
    worklogPoints(logs) +
    entries.reduce(
      (n: number, e: { points?: number }) => n + (e.points || 0),
      0,
    )
  );
}

/** Someone's saved look and whether they may change it now. */
export async function getLook(
  userId: string,
): Promise<{ look: Look; lock: LookLock }> {
  const user = await db.user.findFirst({
    where: { id: userId },
    select: { look: true, lookSetAt: true },
  });
  const look = lookOf(userId, user?.look);
  const setAt: string | null = user?.lookSetAt
    ? new Date(user.lookSetAt).toISOString()
    : null;
  if (!setAt)
    return {
      look,
      lock: {
        locked: false,
        setAt: null,
        until: null,
        pointsSince: 0,
        pointsToGo: 0,
      },
    };
  const until = new Date(Date.parse(setAt) + LOOK_LOCK_DAYS * DAY);
  const pointsSince = await pointsAfter(userId, setAt.slice(0, 10));
  const pointsToGo = Math.max(0, LOOK_UNLOCK_POINTS - pointsSince);
  return {
    look,
    lock: {
      locked: until.getTime() > Date.now() && pointsToGo > 0,
      setAt,
      until: until.toISOString(),
      pointsSince,
      pointsToGo,
    },
  };
}

/**
 * Changes the parts of someone's look given in `changes` (or dresses them
 * in the anime style `changes.style`), and keeps the rest. Refused while
 * their look is locked. Returns the new look, or why it was not saved.
 */
export async function saveLook(userId: string, changes: unknown) {
  const { look: parts, errors } = parseLook(changes);
  if (errors.length) return { errors };
  const current = await getLook(userId);
  if (current.lock.locked) return { errors: [lockMessage(current.lock)] };

  let next: Look = current.look;
  const style = (changes as { style?: unknown } | null)?.style;
  if (typeof style === 'string' && style.trim()) {
    const dressed = styled(next, style);
    if (!dressed) return { errors: [`There is no style called "${style}".`] };
    next = dressed;
  }
  next = { ...next, ...parts };
  if (JSON.stringify(next) === JSON.stringify(current.look))
    return { look: next, lock: current.lock };

  const now = new Date();
  await db.user.update({
    where: { id: userId },
    data: { look: next, lookSetAt: now, updatedAt: now },
  });
  return { look: next, lock: (await getLook(userId)).lock };
}
