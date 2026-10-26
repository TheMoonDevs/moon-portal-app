import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { enforcePermission, getSessionUser } from '@/lib/permissions/server';
import { worklogLines } from '@/lib/worklogs/lines';
import { linkCandidates, linkLines } from '@/lib/worklogs/linker';
import type { WorklogLink, WorkLogs } from '@/models/worklogs';

export const dynamic = 'force-dynamic';

const fail = (status: number, error: string) =>
  NextResponse.json({ status: 'fail', error }, { status });

/** The caller's own worklog, or an error response. */
async function ownWorklog(worklogId: unknown) {
  const denied = await enforcePermission('worklogs:edit');
  if (denied) return { response: denied };
  const user = await getSessionUser();
  if (!user) return { response: fail(401, 'Authentication required.') };
  if (typeof worklogId !== 'string' || worklogId.length < 3)
    return { response: fail(400, 'worklogId is required.') };
  const worklog: WorkLogs | null = await db.workLogs.findFirst({
    where: { id: worklogId },
  });
  if (!worklog) return { response: fail(404, 'Worklog not found.') };
  if (worklog.userId !== user.id)
    return { response: fail(403, 'You can only link your own worklogs.') };
  return { user, worklog };
}

/**
 * Brings a worklog's links up to date with its lines: new lines are linked to
 * a project (and task) when that is clear, and left for the person when not.
 * Returns the links and the projects and tasks they can pick from.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { response, user, worklog } = await ownWorklog(body.worklogId);
  if (response || !user || !worklog) return response;

  const candidates = await linkCandidates(user);
  const existing = (worklog.links ?? []) as WorklogLink[];
  const links = await linkLines(
    worklogLines(worklog.works),
    existing,
    candidates,
  );
  if (JSON.stringify(links) !== JSON.stringify(existing)) {
    await db.workLogs.update({ where: { id: worklog.id }, data: { links } });
  }
  return NextResponse.json({
    status: 'success',
    data: { links, ...candidates },
  });
}

/** The person places one line: `{ worklogId, key, projectId, taskId }`. */
export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { response, user, worklog } = await ownWorklog(body.worklogId);
  if (response || !user || !worklog) return response;

  const links = (worklog.links ?? []) as WorklogLink[];
  const link = links.find((l) => l.key === body.key);
  if (!link) return fail(404, 'That line has changed. Try again.');

  const candidates = await linkCandidates(user);
  const project = candidates.projects.find((p) => p.id === body.projectId);
  if (body.projectId && !project) return fail(400, 'Unknown project.');
  const task = project
    ? candidates.tasks.find(
        (t) => t.id === body.taskId && t.projectId === project.id,
      )
    : undefined;

  const updated: WorklogLink = {
    ...link,
    companyId: project?.companyId ?? null,
    projectId: project?.id ?? null,
    taskId: task?.id ?? null,
    confidence: 1,
    // No project means "not project work", which also stops the question.
    source: 'user',
  };
  const next = links.map((l) => (l.key === link.key ? updated : l));
  await db.workLogs.update({
    where: { id: worklog.id },
    data: { links: next },
  });
  return NextResponse.json({ status: 'success', data: { links: next } });
}
