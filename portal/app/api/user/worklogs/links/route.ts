import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { enforcePermission, getSessionUser } from '@/lib/permissions/server';
import { worklogLines } from '@/lib/worklogs/lines';
import { linkCandidates, linkLines } from '@/lib/worklogs/linker';
import { isPersonalLink } from '@/lib/worklogs/personal';
import type { PointEvent } from '@/lib/worklogs/timeline';
import {
  appendEvents,
  sectionLines,
  trackLines,
} from '@/lib/worklogs/timeline';
import { toDay } from '@/lib/workspace/projects';
import { settleScheduledLines } from '@/lib/workspace/scheduleRuns';
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
 * New lines and status changes the person made are added to the timeline.
 * Returns the links, the timeline, which lines are the assistant's, and the
 * projects and tasks they can pick from.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { response, user, worklog } = await ownWorklog(body.worklogId);
  if (response || !user || !worklog) return response;

  const candidates = await linkCandidates(user);
  const existing = (worklog.links ?? []) as WorklogLink[];
  // Done lines about a scheduled task finish it for their day.
  const links = await settleScheduledLines(
    user.id,
    worklog.works,
    await linkLines(worklogLines(worklog.works), existing, candidates),
    candidates.projects.map((p) => p.id),
    /^\d{4}-\d{2}-\d{2}$/.test(worklog.date ?? '') ? worklog.date! : toDay(),
  );
  const events = trackLines(worklog.works, worklog.timeline as PointEvent[]);
  const timeline = appendEvents(worklog.timeline as PointEvent[], events);
  if (JSON.stringify(links) !== JSON.stringify(existing) || events.length) {
    await db.workLogs.update({
      where: { id: worklog.id },
      data: { links, timeline },
    });
  }
  const claudeKeys = sectionLines(worklog.works)
    .filter((l) => l.claude)
    .map((l) => l.key);
  return NextResponse.json({
    status: 'success',
    data: { links, timeline, claudeKeys, ...candidates },
  });
}

/**
 * The person places one line: `{ worklogId, key, projectId, taskId }`, or
 * marks a line they typed as the same work as one of their assistant's
 * points: `{ worklogId, key, sameAs }` (null to unlink).
 */
export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { response, user, worklog } = await ownWorklog(body.worklogId);
  if (response || !user || !worklog) return response;

  const links = (worklog.links ?? []) as WorklogLink[];
  const link = links.find((l) => l.key === body.key);
  if (!link) return fail(404, 'That line has changed. Try again.');
  if (isPersonalLink(link))
    return fail(
      400,
      'Private lines stay in Personal. Remove "p:" to link it to a project.',
    );

  if ('sameAs' in body) {
    const claude = sectionLines(worklog.works).filter((l) => l.claude);
    if (claude.some((l) => l.key === body.key))
      return fail(400, 'Link one of your own lines to a Claude point.');
    const target = body.sameAs
      ? links.find(
          (l) => l.key === body.sameAs && claude.some((c) => c.key === l.key),
        )
      : null;
    if (body.sameAs && !target)
      return fail(404, 'That Claude point has changed. Try again.');
    const updated: WorklogLink = target
      ? {
          ...link,
          sameAs: target.key,
          // It is the same work, so it goes where the point went.
          ...(target.source !== 'none' && {
            companyId: target.companyId,
            projectId: target.projectId,
            taskId: target.taskId,
            confidence: 1,
            source: 'user',
          }),
        }
      : { ...link, sameAs: null };
    const next = links.map((l) => (l.key === link.key ? updated : l));
    await db.workLogs.update({
      where: { id: worklog.id },
      data: { links: next },
    });
    return NextResponse.json({ status: 'success', data: { links: next } });
  }

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
