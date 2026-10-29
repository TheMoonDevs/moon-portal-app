import dayjs from 'dayjs';
import type { NextRequest } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { lineKey } from '@/lib/worklogs/lines';
import { isPersonalLink } from '@/lib/worklogs/personal';
import {
  fail,
  getPublicUsers,
  ok,
  requireProjectPermission,
} from '@/lib/workspace/server';
import type { WorklogLink, WorkLogs } from '@/models/worklogs';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string } };

const MAX_DAYS = 90;

/** Keys of the lines ticked off (✅) in a worklog's sections. */
const doneKeys = (works: unknown) => {
  const keys = new Set<string>();
  if (!Array.isArray(works)) return keys;
  for (const work of works) {
    const content = typeof work?.content === 'string' ? work.content : '';
    for (const raw of content.split('\n'))
      if (raw.includes('✅')) keys.add(lineKey(raw));
  }
  return keys;
};

const isDay = (v: string | null): v is string =>
  !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * Worklog lines linked to the project from `?from=` to `?to=` (YYYY-MM-DD),
 * or over the last `?days=` (30 by default), one entry per person per day,
 * newest first. Private lines never show here.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { response, project } = await requireProjectPermission(
    params.projectId,
    'projects:read',
  );
  if (response || !project)
    return response ?? fail(401, 'Authentication required.');

  const search = request.nextUrl.searchParams;
  const asked = Number(search.get('days'));
  const days = Math.min(MAX_DAYS, Math.max(1, asked || 30));
  const askedFrom = search.get('from');
  const askedTo = search.get('to');
  const ranged = isDay(askedFrom) && isDay(askedTo) && askedFrom <= askedTo;
  const from = ranged
    ? askedFrom
    : dayjs()
        .subtract(days - 1, 'day')
        .format('YYYY-MM-DD');
  const to = ranged ? askedTo : null;

  const logs: WorkLogs[] = await db.workLogs.findMany({
    where: {
      'links.projectId': project.id,
      logType: 'dayLog',
      date: to ? { gte: from, lte: to } : { gte: from },
    },
    select: { userId: true, date: true, works: true, links: true },
    orderBy: { date: 'desc' },
  });

  const entries = logs
    .map((log) => {
      const done = doneKeys(log.works);
      const lines = ((log.links ?? []) as WorklogLink[])
        .filter((l) => l.projectId === project.id && !isPersonalLink(l))
        .map((l) => ({
          key: l.key,
          text: l.text,
          taskId: l.taskId,
          done: done.has(l.key),
        }));
      return { id: log.id, date: log.date, userId: log.userId, lines };
    })
    .filter((e) => e.lines.length);

  const users = await getPublicUsers(entries.map((e) => e.userId as string));
  return ok({ from, to, days, entries, users });
}
