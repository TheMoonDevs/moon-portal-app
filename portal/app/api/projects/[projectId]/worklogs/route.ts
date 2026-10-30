import dayjs from 'dayjs';
import type { NextRequest } from 'next/server';

import { projectWork } from '@/lib/daywork/server';
import {
  fail,
  getPublicUsers,
  ok,
  requireProjectPermission,
} from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string } };

const MAX_DAYS = 90;

const isDay = (v: string | null): v is string =>
  !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * The project's tasks people worked on from `?from=` to `?to=`
 * (YYYY-MM-DD), or over the last `?days=` (30 by default), one entry per
 * person per day, newest first. Private points never show here.
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

  const byDay = new Map<
    string,
    {
      id: string;
      date: string;
      userId: string;
      lines: {
        key: string;
        text: string;
        taskId: string | null;
        done: boolean;
      }[];
    }
  >();
  for (const line of await projectWork([project.id], from, to)) {
    const id = `${line.userId}:${line.date}`;
    const entry = byDay.get(id) ?? {
      id,
      date: line.date,
      userId: line.userId,
      lines: [],
    };
    entry.lines.push({
      key: line.taskId,
      text: line.text,
      taskId: line.taskId,
      done: line.done,
    });
    byDay.set(id, entry);
  }
  const entries = Array.from(byDay.values());
  const users = await getPublicUsers(entries.map((e) => e.userId));
  return ok({ from, to, days, entries, users });
}
