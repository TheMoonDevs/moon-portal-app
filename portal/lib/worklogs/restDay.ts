import dayjs from 'dayjs';

import { db } from '@/lib/mongodb/db-client';
import { hasContent } from '@/lib/progress/server';
import type { WorkLogs } from '@/models/worklogs';
import type { WorkLogPoints } from '@/utils/@types/interfaces';
import { LOGLINKTYPE } from '@/utils/@types/interfaces';

export const REST_DAY_LINE = '* 🌴 Rest day';

/**
 * Marks a day as a rest day: the day's worklog gets `restDay: true` and, when
 * nothing was written yet, a "Rest day" line in its General section.
 */
export async function markRestDay(userId: string, date: string) {
  const where = { userId, logType: 'dayLog', date };
  const existing: WorkLogs | null = await db.workLogs.findFirst({ where });
  const now = new Date();

  if (existing) {
    const works = (Array.isArray(existing.works)
      ? existing.works
      : []) as unknown as WorkLogPoints[];
    const nextWorks = hasContent(existing)
      ? works
      : works.length
        ? works.map((w, i) => (i === 0 ? { ...w, content: REST_DAY_LINE } : w))
        : [generalSection()];
    return db.workLogs.update({
      where: { id: existing.id },
      data: { restDay: true, works: nextWorks, updatedAt: now },
    });
  }

  return db.workLogs.create({
    data: {
      ...where,
      title: `${dayjs(date).format('MMMM DD')}  - ${dayjs(date).format('dddd')}`,
      works: [generalSection()],
      restDay: true,
      createdAt: now,
      updatedAt: now,
    },
  });
}

const generalSection = (): WorkLogPoints => ({
  link_type: LOGLINKTYPE.GENERAL,
  link_id: 'general',
  title: 'General',
  icon: 'work',
  content: REST_DAY_LINE,
});
