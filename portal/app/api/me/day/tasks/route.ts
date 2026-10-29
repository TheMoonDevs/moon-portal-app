import type { TaskMove } from '@/lib/daywork/server';
import {
  createDayTask,
  isDay,
  mineWhere,
  readPlace,
  TASK_MOVES,
  todayOf,
} from '@/lib/daywork/server';
import { db } from '@/lib/mongodb/db-client';
import { fail, ok, requireUser } from '@/lib/workspace/server';
import type { Task } from '@/models/workspace';
import { OPEN_TASK_STATUSES, TASK_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

/**
 * The caller's tasks for its side panel: every open one, in any company or
 * none, and the ones archived in the last 60 days.
 */
export async function GET() {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const [open, archived, today]: [Task[], Task[], string] = await Promise.all([
    db.task.findMany({
      where: {
        AND: [mineWhere(user.id), { status: { in: OPEN_TASK_STATUSES } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    }),
    db.task.findMany({
      where: {
        AND: [
          mineWhere(user.id),
          { status: TASK_STATUS.ARCHIVED, updatedAt: { gte: since } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    todayOf(user.id),
  ]);
  const projectIds = Array.from(
    new Set([...open, ...archived].map((t) => t.projectId).filter(Boolean)),
  );
  const projects = projectIds.length
    ? await db.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, name: true, color: true, companyId: true },
      })
    : [];
  return ok({ today, tasks: open, archived, projects });
}

/**
 * A new task on the caller's day sheet: `{date, title, afterId?, place?,
 * status?}`. Without a place it is placed from its words.
 */
export async function POST(request: Request) {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  if (!isDay(body.date)) return fail(400, 'Use YYYY-MM-DD for the date.');
  const title = typeof body.title === 'string' ? body.title : '';
  const task = await createDayTask(user, {
    title,
    date: body.date,
    afterId: typeof body.afterId === 'string' ? body.afterId : null,
    place: readPlace(body.place),
    status:
      TASK_MOVES.includes(body.status) && body.status !== 'archived'
        ? (body.status as TaskMove)
        : undefined,
  });
  return ok({ task });
}
