import { addPoint, todayOf } from '@/lib/daywork/server';
import { db } from '@/lib/mongodb/db-client';
import { isAllowedInCompany, teamAllows } from '@/lib/permissions/company';
import { syncTaskPoints } from '@/lib/progress/server';
import { requirePlan } from '@/lib/workspace/planServer';
import { fail, ok } from '@/lib/workspace/server';
import type { Project, Task } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { planId: string; stepId: string } };

/**
 * Adds a note to the task a step links to, as a work point on it:
 * `{ text }`. The step stays as it is.
 */
export async function POST(request: Request, { params }: Params) {
  const { response, plan, user, access } = await requirePlan(
    params.planId,
    'edit',
  );
  if (response || !plan || !user)
    return response ?? fail(404, 'Plan not found.');
  const step = plan.steps?.find((s) => s.id === params.stepId);
  if (!step?.taskId) return fail(400, 'That step is not linked to a task.');
  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) return fail(400, 'Write the note first.');

  const task: Task | null = await db.task.findFirst({
    where: { id: step.taskId, companyId: plan.companyId },
  });
  if (!task) return fail(404, 'That task is gone.');
  const project: Project | null = task.projectId
    ? await db.project.findFirst({ where: { id: task.projectId } })
    : null;
  if (
    !isAllowedInCompany(user, access, 'tasks:edit') &&
    !teamAllows(user, project, 'tasks:edit') &&
    !(task.assigneeIds ?? []).includes(user.id)
  )
    return fail(403, 'Only the people on that task’s project can add to it.');

  const point = await addPoint({
    task,
    userId: user.id,
    date: await todayOf(user.id),
    text,
  });
  await syncTaskPoints(task);
  return ok({ point }, { status: 201 });
}
