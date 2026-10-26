import { CLAUDE_SECTION_ID, statusOf, todayFor } from '@/lib/mcp/worklog';
import { db } from '@/lib/mongodb/db-client';
import { normalizeLine, PRIVATE_LINE } from '@/lib/worklogs/lines';
import {
  fail,
  getWorkspaceForUser,
  ok,
  requireUser,
} from '@/lib/workspace/server';
import type { BotPoint, WorldPerson } from '@/lib/world/state';
import { botState, currentPoint } from '@/lib/world/state';
import type { WorkLogs } from '@/models/worklogs';
import type { CompanyMember } from '@/models/workspace';
import { MEMBER_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

const contentLines = (content: unknown) =>
  (typeof content === 'string' ? content : '')
    .split('\n')
    .filter((l) => normalizeLine(l).replace(/[^\p{L}\p{N}]/gu, '').length >= 3);

/**
 * Everyone in the viewer's companies (or one, `?companyId=`) with today's
 * bot activity. Private lines are never sent; other people's own lines are
 * only counted.
 */
export async function GET(request: Request) {
  const { response, user } = await requireUser();
  if (response || !user) return response ?? fail(401, 'Sign in first.');

  const workspace = await getWorkspaceForUser(user);
  const mine = workspace.filter((w) => w.member);
  const companies = (mine.length ? mine : workspace).map((w) => w.company);
  const wanted = new URL(request.url).searchParams.get('companyId');
  const scoped = wanted ? companies.filter((c) => c.id === wanted) : companies;

  const members: CompanyMember[] = scoped.length
    ? await db.companyMember.findMany({
        where: {
          companyId: { in: scoped.map((c) => c.id) },
          status: MEMBER_STATUS.ACTIVE,
        },
      })
    : [];
  const userIds = Array.from(
    new Set([user.id, ...members.map((m) => m.userId)]),
  );
  const users = await db.user.findMany({
    where: { id: { in: userIds }, status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
      positionTitle: true,
      timezone: true,
    },
  });
  const me = users.find((u: any) => u.id === user.id);
  const today = todayFor(me?.timezone);
  const logs: WorkLogs[] = await db.workLogs.findMany({
    where: {
      userId: { in: users.map((u: any) => u.id) },
      logType: 'dayLog',
      date: today,
    },
  });

  const people: WorldPerson[] = users.map((u: any) => {
    const log = logs.find((l) => l.userId === u.id);
    const works = Array.isArray(log?.works) ? (log!.works as any[]) : [];
    const botLines = contentLines(
      works.find((w) => w?.link_id === CLAUDE_SECTION_ID)?.content,
    ).filter((l) => !PRIVATE_LINE.test(l));
    const ownPoints = works
      .filter((w) => w?.link_id !== CLAUDE_SECTION_ID)
      .reduce((n, w) => n + contentLines(w?.content).length, 0);
    const points: BotPoint[] = botLines.map((l) => ({
      text: normalizeLine(l),
      status: statusOf(l),
    }));
    const counts = { doing: 0, done: 0, not_done: 0, blocked: 0, waiting: 0 };
    for (const p of points) if (p.status) counts[p.status] += 1;
    const state = botState(points);
    return {
      id: u.id,
      name: u.name || u.username,
      avatar: u.avatar ?? null,
      title: u.positionTitle ?? null,
      isMe: u.id === user.id,
      ownPoints,
      guidance: log?.guidance ?? 0,
      bot: { state, current: currentPoint(points, state), points, counts },
    };
  });

  return ok({
    date: today,
    companies: companies.map((c) => ({ id: c.id, name: c.name })),
    people,
  });
}
