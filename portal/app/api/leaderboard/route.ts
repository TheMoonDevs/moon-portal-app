import dayjs from 'dayjs';
import type { NextRequest } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { getBuffLevelAndTitle, worklogPoints } from '@/lib/progress/buff';
import { hasContent } from '@/lib/progress/server';
import {
  fail,
  getPublicUsers,
  ok,
  requireCompanyPermission,
} from '@/lib/workspace/server';
import type { PointEntry } from '@/models/progress';
import type { CompanyMember } from '@/models/workspace';
import { MEMBER_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

/**
 * A company's leaderboard for one month (`?companyId=&month=YYYY-MM`, this
 * month by default): every active member with their points (worklog lines
 * plus tasks finished in that company), their monthly worklog buff, tasks
 * finished and days they wrote a worklog.
 */
export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId');
  const { response } = await requireCompanyPermission(
    companyId,
    'companies:read',
  );
  if (response || !companyId)
    return response ?? fail(400, 'companyId is required.');

  const monthParam = request.nextUrl.searchParams.get('month');
  const month = dayjs(
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? `${monthParam}-01`
      : undefined,
  ).startOf('month');
  const from = month.format('YYYY-MM-DD');
  const to = month.endOf('month').format('YYYY-MM-DD');

  const members: CompanyMember[] = await db.companyMember.findMany({
    where: { companyId, status: MEMBER_STATUS.ACTIVE },
  });
  const userIds = members.map((m) => m.userId);
  if (!userIds.length) {
    return ok({ month: month.format('YYYY-MM'), rows: [] });
  }

  const [entries, logs, users] = await Promise.all([
    db.pointEntry.findMany({
      where: { companyId, date: { gte: from, lte: to } },
    }) as Promise<PointEntry[]>,
    db.workLogs.findMany({
      where: {
        userId: { in: userIds },
        logType: 'dayLog',
        date: { gte: from, lte: to },
      },
      select: { userId: true, date: true, works: true },
    }),
    getPublicUsers(userIds),
  ]);

  type Row = {
    user: { id: string };
    points: number;
    taskPoints: number;
    worklogPoints: number;
    tasksDone: number;
    worklogDays: number;
    buff: { title: string; src: string } | null;
  };
  const rows = users
    .map((user: { id: string }): Row => {
      const mine = entries.filter((e) => e.userId === user.id);
      const myLogs = logs.filter(
        (l: { userId: string; works?: unknown }) =>
          l.userId === user.id && hasContent(l),
      );
      const days = new Set(myLogs.map((l: { date: string }) => l.date));
      const taskPoints = mine.reduce((sum, e) => sum + (e.points || 0), 0);
      const fromWorklogs = worklogPoints(myLogs);
      const buff = fromWorklogs > 0 ? getBuffLevelAndTitle(fromWorklogs) : null;
      return {
        user,
        points: taskPoints + fromWorklogs,
        taskPoints,
        worklogPoints: fromWorklogs,
        buff: buff && { title: buff.title, src: buff.src },
        tasksDone: new Set(mine.filter((e) => e.taskId).map((e) => e.taskId))
          .size,
        worklogDays: days.size,
      };
    })
    .sort(
      (a: Row, b: Row) =>
        b.points - a.points ||
        b.worklogDays - a.worklogDays ||
        b.tasksDone - a.tasksDone,
    )
    .map((row: Row, i: number) => ({ ...row, rank: i + 1 }));

  return ok({ month: month.format('YYYY-MM'), rows });
}
