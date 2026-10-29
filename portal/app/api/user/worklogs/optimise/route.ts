import { NextResponse } from 'next/server';

import { tidyPoints } from '@/lib/mcp/worklog';
import { db } from '@/lib/mongodb/db-client';
import { enforcePermission, getSessionUser } from '@/lib/permissions/server';
import { lineKey } from '@/lib/worklogs/lines';
import { movedClaudeLines, planOptimise } from '@/lib/worklogs/optimise';
import type { PointEvent, PointStatus } from '@/lib/worklogs/timeline';
import { CLAUDE_SECTION_ID, POINT_STATUSES } from '@/lib/worklogs/timeline';
import type { WorkLogs } from '@/models/worklogs';

export const dynamic = 'force-dynamic';

const fail = (status: number, error: string) =>
  NextResponse.json({ status: 'fail', error }, { status });

async function caller() {
  const denied = await enforcePermission('worklogs:edit');
  if (denied) return { response: denied };
  const user = await getSessionUser();
  if (!user) return { response: fail(401, 'Authentication required.') };
  return { user };
}

/** A preview: `{ worklogId }` → the groups the day's points would become. */
export async function POST(request: Request) {
  const { response, user } = await caller();
  if (response || !user) return response;
  const { worklogId } = await request.json().catch(() => ({}));
  if (typeof worklogId !== 'string' || worklogId.length < 3)
    return fail(400, 'worklogId is required.');
  const plan = await planOptimise(user, worklogId);
  if ('error' in plan) return fail(plan.status ?? 400, plan.error!);
  return NextResponse.json({ status: 'success', data: plan });
}

/**
 * Applies a previewed plan: `{ worklogId, groups: [{ text, status, merge }] }`.
 * Every merged line is kept as a note on its new point.
 */
export async function PUT(request: Request) {
  const { response, user } = await caller();
  if (response || !user) return response;
  const { worklogId, groups } = await request.json().catch(() => ({}));
  if (typeof worklogId !== 'string' || !Array.isArray(groups) || !groups.length)
    return fail(400, 'worklogId and groups are required.');
  const worklog: WorkLogs | null = await db.workLogs.findFirst({
    where: { id: worklogId },
  });
  if (!worklog) return fail(404, 'Worklog not found.');
  if (worklog.userId !== user.id)
    return fail(403, 'You can only optimise your own worklog.');
  if (worklog.tasksFirst)
    return fail(409, 'This day is kept as tasks now. Reload.');

  const points = groups.map((g: any) => ({
    text: typeof g?.text === 'string' ? g.text.trim().slice(0, 200) : '',
    status: (g?.status in POINT_STATUSES ? g.status : 'done') as PointStatus,
    merge: Array.isArray(g?.merge) ? g.merge.map(String) : [],
  }));
  if (points.some((p) => !p.text || !p.merge.length))
    return fail(400, 'Each group needs words and the points it merges.');
  const keys = points.map((p) => lineKey(p.text));
  if (new Set(keys).size !== keys.length)
    return fail(
      400,
      'Two groups have the same words. Make each one different.',
    );

  // Lines that moved on to a later day stay as they are: they are taken out
  // for the tidy and put back after it.
  const moved = movedClaudeLines(worklog.works);
  try {
    const result = await tidyPoints(
      user,
      points,
      moved.map((l) => l.key),
      worklog.date as string,
    );
    if (moved.length) {
      const saved: WorkLogs | null = await db.workLogs.findFirst({
        where: { id: worklog.id },
      });
      const keys = new Set(moved.map((l) => l.key));
      await db.workLogs.update({
        where: { id: worklog.id },
        data: {
          works: (saved?.works as any[]).map((w) =>
            w?.link_id === CLAUDE_SECTION_ID
              ? {
                  ...w,
                  content: [w.content, ...moved.map((l) => l.raw)]
                    .filter(Boolean)
                    .join('\n'),
                }
              : w,
          ),
          timeline: [
            ...((saved?.timeline ?? []) as PointEvent[]),
            ...((worklog.timeline ?? []) as PointEvent[]).filter((e) =>
              keys.has(e.key),
            ),
          ],
          removedClaudeKeys: (
            (saved?.removedClaudeKeys ?? []) as string[]
          ).filter((k) => !keys.has(k)),
        },
      });
    }
    return NextResponse.json({ status: 'success', data: result });
  } catch (err) {
    return fail(
      409,
      err instanceof Error
        ? `${err.message} Run Optimise again for a fresh preview.`
        : 'Could not optimise this day.',
    );
  }
}
