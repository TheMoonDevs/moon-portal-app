import { db } from '@/lib/mongodb/db-client';
import type { RestDay } from '@/models/workspace';

/** Marks one of a person's days as a rest day; marking it again is fine. */
export async function markRestDay(userId: string, date: string) {
  const existing: RestDay | null = await db.restDay.findFirst({
    where: { userId, date },
  });
  if (existing) return existing;
  const now = new Date().toISOString();
  return db.restDay.create({
    data: { userId, date, createdAt: now, updatedAt: now },
  });
}

/** Whether the person marked the day as a rest day. */
export async function isRestDay(userId: string, date: string) {
  return !!(await db.restDay.count({ where: { userId, date } }));
}
