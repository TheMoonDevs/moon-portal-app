import { isMine } from '@/lib/daywork/server';
import { db } from '@/lib/mongodb/db-client';
import { meetingFactsFor } from '@/lib/meet/meetingTasks';
import { fail, getPublicUsers, ok, requireUser } from '@/lib/workspace/server';
import type { Task, WorkPoint } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { taskId: string } };

/**
 * One of the caller's tasks with its whole history, for the app's task
 * screen: the task, its work points (others' private ones left out), its
 * project, the people who logged on it, and its meeting if it is one.
 */
export async function GET(_request: Request, { params }: Params) {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  const task: Task | null = await db.task.findFirst({
    where: { id: params.taskId },
  });
  if (!task) return fail(404, 'Task not found.');
  if (!isMine(task, user.id))
    return fail(403, 'Only your own tasks open here.');

  const [points, project]: [WorkPoint[], any] = await Promise.all([
    db.workPoint.findMany({
      where: { taskId: task.id },
      orderBy: { at: 'asc' },
      take: 500,
    }),
    task.projectId
      ? db.project.findFirst({
          where: { id: task.projectId },
          select: {
            id: true,
            name: true,
            color: true,
            logo: true,
            companyId: true,
            goals: true,
          },
        })
      : null,
  ]);
  const visible = points.filter((p) => !p.isPrivate || p.userId === user.id);
  const [people, meetings] = await Promise.all([
    getPublicUsers(visible.map((p) => p.userId)),
    meetingFactsFor([task], user.id),
  ]);
  return ok({
    task: meetings[task.id] ? { ...task, meeting: meetings[task.id] } : task,
    points: visible,
    project: project
      ? {
          id: project.id,
          name: project.name,
          color: project.color ?? null,
          logo: project.logo ?? null,
          companyId: project.companyId,
          goals: (project.goals ?? []).map((g: any) => ({
            id: g.id,
            title: g.title,
            kind: g.kind ?? 'scheduled',
          })),
        }
      : null,
    people,
  });
}
