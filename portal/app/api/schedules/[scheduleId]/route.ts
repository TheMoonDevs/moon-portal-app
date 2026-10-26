import { db } from '@/lib/mongodb/db-client';
import { readScheduleBody } from '@/lib/workspace/scheduleInput';
import { runDueSchedules } from '@/lib/workspace/schedules';
import {
  fail,
  nowIso,
  ok,
  requireProjectPermission,
} from '@/lib/workspace/server';
import type { TaskSchedule } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { scheduleId: string } };

async function guard(scheduleId: string, permission: string) {
  const schedule: TaskSchedule | null = await db.taskSchedule.findFirst({
    where: { id: scheduleId },
  });
  if (!schedule)
    return { response: fail(404, 'Schedule not found.'), schedule: null };
  const { response, project } = await requireProjectPermission(
    schedule.projectId,
    permission,
  );
  return { response, schedule, project };
}

export async function PATCH(request: Request, { params }: Params) {
  const { response, schedule, project } = await guard(
    params.scheduleId,
    'tasks:edit',
  );
  if (response || !schedule || !project)
    return response ?? fail(401, 'Authentication required.');

  const body = await request.json().catch(() => ({}));
  const { data, error } = readScheduleBody(body, project, schedule);
  if (error || !data) return fail(400, error ?? 'Invalid schedule.');

  const updated = await db.taskSchedule.update({
    where: { id: schedule.id },
    data: { ...data, updatedAt: nowIso() },
  });
  await runDueSchedules({ projectId: { in: [project.id] } });
  return ok({ schedule: updated });
}

/** Stops the schedule. Tasks it already created stay. */
export async function DELETE(_request: Request, { params }: Params) {
  const { response, schedule } = await guard(params.scheduleId, 'tasks:delete');
  if (response || !schedule)
    return response ?? fail(401, 'Authentication required.');
  await db.taskSchedule.delete({ where: { id: schedule.id } });
  return ok({ schedule });
}
