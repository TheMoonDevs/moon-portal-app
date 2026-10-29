import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { enforcePermission, getSessionUser } from '@/lib/permissions/server';
import { worklogLines } from '@/lib/worklogs/lines';
import { linkCandidates, linkLines } from '@/lib/worklogs/linker';
import { isPersonalLink } from '@/lib/worklogs/personal';
import {
  applyRenames,
  putAwayRemoved,
  readKeys,
  readRenames,
} from '@/lib/worklogs/rekey';
import type { PointEvent } from '@/lib/worklogs/timeline';
import {
  appendEvents,
  sectionLines,
  trackLines,
} from '@/lib/worklogs/timeline';
import { taskLines } from '@/lib/workspace/lineTasks';
import { toDay } from '@/lib/workspace/projects';
import { settleScheduledLines } from '@/lib/workspace/scheduleRuns';
import type { WorklogLink, WorkLogs } from '@/models/worklogs';
import type { Task } from '@/models/workspace';
import { TASK_STATUS } from '@/models/workspace';

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
  // A day kept as tasks is written from them: its lines link themselves.
  if (worklog.tasksFirst)
    return { response: fail(409, 'This day is kept as tasks now. Reload.') };
  return { user, worklog };
}

/** The projects, companies and tasks the caller's lines can go to. */
export async function GET() {
  const denied = await enforcePermission('worklogs:edit');
  if (denied) return denied;
  const user = await getSessionUser();
  if (!user) return fail(401, 'Authentication required.');
  return NextResponse.json({
    status: 'success',
    data: await linkCandidates(user),
  });
}

/**
 * Brings a worklog's links up to date with its lines: new lines are linked to
 * a project (and task) when that is clear, and left for the person when not.
 * New lines and status changes the person made are added to the timeline.
 * `renames` ([{ from, to }] line keys) carry a reworded line's place and
 * history over to its new words; `removed` (keys) are lines taken out, whose
 * untouched tasks are put away. Returns the links, the timeline, which lines
 * are the assistant's, and the projects and tasks they can pick from.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { response, user, worklog } = await ownWorklog(body.worklogId);
  if (response || !user || !worklog) return response;

  const renamed = await applyRenames(
    worklog.works,
    (worklog.links ?? []) as WorklogLink[],
    (worklog.timeline ?? []) as PointEvent[],
    readRenames(body.renames),
  );
  if (renamed.changed) {
    worklog.links = renamed.links;
    worklog.timeline = renamed.timeline;
    await db.workLogs.update({
      where: { id: worklog.id },
      data: { links: renamed.links, timeline: renamed.timeline },
    });
  }
  const removed = readKeys(body.removed);
  if (removed.length)
    await putAwayRemoved(user.id, worklog.works, renamed.links, removed);

  const candidates = await linkCandidates(user);
  const existing = (worklog.links ?? []) as WorklogLink[];
  const projectIds = candidates.projects.map((p) => p.id);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(worklog.date ?? '')
    ? worklog.date!
    : toDay();
  // Done lines about a scheduled task finish it for their day; other
  // running lines get a task of their own, or the open one for the work.
  const links = await taskLines(
    user.id,
    worklog.works,
    await settleScheduledLines(
      user.id,
      worklog.works,
      await linkLines(worklogLines(worklog.works), existing, candidates),
      projectIds,
      day,
    ),
    projectIds,
    day,
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
  // The tasks lines are on, done ones too, with the goal each counts towards.
  const taskIds = Array.from(
    new Set(links.map((l) => l.taskId).filter((id): id is string => !!id)),
  );
  const linkedTasks: Task[] = taskIds.length
    ? await db.task.findMany({
        where: { id: { in: taskIds } },
        select: {
          id: true,
          title: true,
          status: true,
          projectId: true,
          goalId: true,
          goalPartId: true,
          goalChecked: true,
          size: true,
          forDate: true,
          dueDate: true,
          createdAt: true,
        },
      })
    : [];
  return NextResponse.json({
    status: 'success',
    data: { links, timeline, claudeKeys, linkedTasks, ...candidates },
  });
}

/**
 * The person places one line: `{ worklogId, key, projectId, taskId }`, or
 * `{ worklogId, key, companyId }` for company work on none of its projects, or
 * marks a line they typed as the same work as one of their assistant's
 * points: `{ worklogId, key, sameAs }` (null to unlink). One of the
 * assistant's lines goes under one of the person's points with
 * `{ worklogId, key, parentKey }` (null to take it out again).
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

  // One of the assistant's lines goes under one of the person's points.
  if ('parentKey' in body) {
    const lines = sectionLines(worklog.works);
    if (!lines.some((l) => l.claude && l.key === body.key))
      return fail(400, 'Only Claude points go under another point.');
    const parent = body.parentKey
      ? links.find(
          (l) =>
            l.key === body.parentKey &&
            lines.some((x) => !x.claude && x.key === l.key),
        )
      : null;
    if (body.parentKey && !parent)
      return fail(404, 'That point has changed. Try again.');
    const updated: WorklogLink = parent
      ? {
          ...link,
          parentKey: parent.key,
          // It is part of that work, so it goes where that point went.
          ...(parent.source !== 'none' && {
            companyId: parent.companyId,
            projectId: parent.projectId,
            taskId: parent.taskId,
          }),
          confidence: 1,
          source: 'user',
        }
      : { ...link, parentKey: null };
    const next = links.map((l) => (l.key === link.key ? updated : l));
    await db.workLogs.update({
      where: { id: worklog.id },
      data: { links: next },
    });
    return NextResponse.json({ status: 'success', data: { links: next } });
  }

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
  const company = project
    ? undefined
    : candidates.companies.find((c) => c.id === body.companyId);
  if (!project && body.companyId && !company)
    return fail(400, 'Unknown company.');
  let task: Pick<Task, 'id'> | undefined = project
    ? candidates.tasks.find(
        (t) => t.id === body.taskId && t.projectId === project.id,
      )
    : undefined;
  // A task further down their list than the linker looks.
  if (project && !task && typeof body.taskId === 'string')
    task =
      (await db.task.findFirst({
        where: { id: body.taskId, projectId: project.id },
        select: { id: true },
      })) ?? undefined;
  // A point moved to another project takes the task made from it along,
  // while that task is still open: the point and its task are one thing.
  if (project && !task && !body.taskId && link.taskId) {
    const own: Task | null = await db.task.findFirst({
      where: { id: link.taskId },
    });
    if (
      own &&
      own.fromLine === link.key &&
      own.projectId !== project.id &&
      own.status !== TASK_STATUS.DONE &&
      own.status !== TASK_STATUS.ARCHIVED &&
      own.status !== TASK_STATUS.IGNORED
    ) {
      await db.task.update({
        where: { id: own.id },
        data: {
          companyId: project.companyId,
          projectId: project.id,
          goalId: null,
          goalPartId: null,
          goalChecked: false,
          updatedAt: new Date().toISOString(),
        },
      });
      task = { id: own.id };
    }
  }

  const updated: WorklogLink = {
    ...link,
    companyId: project?.companyId ?? company?.id ?? null,
    projectId: project?.id ?? null,
    taskId: task?.id ?? null,
    confidence: 1,
    // Neither means "not company work", which also stops the question.
    source: 'user',
  };
  const next = links.map((l) => (l.key === link.key ? updated : l));
  await db.workLogs.update({
    where: { id: worklog.id },
    data: { links: next },
  });
  return NextResponse.json({ status: 'success', data: { links: next } });
}
