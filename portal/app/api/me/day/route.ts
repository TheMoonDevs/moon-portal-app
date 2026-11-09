import { mergeCopies } from '@/lib/daywork/duplicates';
import { isDay, loadDay } from '@/lib/daywork/server';
import { syncMeetingTasks } from '@/lib/meet/meetingTasks';
import { db } from '@/lib/mongodb/db-client';
import { linkCandidates } from '@/lib/worklogs/linker';
import { fail, ok, requireUser } from '@/lib/workspace/server';
import type { ProjectGoal } from '@/models/workspace';

/** A project's goals as the day sheet links tasks to them. */
const goalsFor = (goals: ProjectGoal[]) =>
  goals.map((g) => ({
    id: g.id,
    title: g.title,
    kind: g.kind ?? 'scheduled',
    period: g.period,
    target: g.target,
    days: g.days ?? [],
    monthDay: g.monthDay ?? null,
    slots: g.slots ?? [],
    since: g.since,
    makeTasks: g.makeTasks !== false,
    ...(g.parts?.length && {
      parts: g.parts.map((x) => ({
        id: x.id,
        label: x.label,
        target: x.target,
      })),
    }),
  }));

export const dynamic = 'force-dynamic';

/**
 * The caller's day: its tasks (on today, every task still pending from
 * before too), their work points, and the projects and companies a task can
 * be put in.
 */
export async function GET(request: Request) {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  const date = new URL(request.url).searchParams.get('date');
  if (!isDay(date)) return fail(400, 'Use YYYY-MM-DD for the date.');

  // Copies of one task (left by the old carry-over) become one task first.
  await mergeCopies(user.id).catch(() => 0);
  // Confirmed meetings around today are tasks on their days.
  await syncMeetingTasks(user);
  const [day, candidates] = await Promise.all([
    loadDay(user.id, date),
    linkCandidates(user),
  ]);
  // The goals a task can be linked to, with what decides their run days.
  const goalsById = new Map<string, ProjectGoal[]>(
    (
      await db.project.findMany({
        where: { id: { in: candidates.projects.map((p) => p.id) } },
        select: { id: true, goals: true },
      })
    ).map((p: { id: string; goals?: ProjectGoal[] }) => [p.id, p.goals ?? []]),
  );
  // Projects of tasks outside the person's own (e.g. assigned elsewhere).
  const known = new Set(candidates.projects.map((p) => p.id));
  const missing = Array.from(
    new Set(
      day.tasks.map((t) => t.projectId).filter((id) => id && !known.has(id)),
    ),
  );
  const extra = missing.length
    ? await db.project.findMany({
        where: { id: { in: missing } },
        select: {
          id: true,
          name: true,
          color: true,
          logo: true,
          companyId: true,
          goals: true,
        },
      })
    : [];
  const goalsOf = (projectId: string) =>
    goalsFor(
      candidates.projects.some((p) => p.id === projectId)
        ? ((goalsById.get(projectId) ?? []) as ProjectGoal[])
        : ((extra.find((p: { id: string }) => p.id === projectId)?.goals ??
            []) as ProjectGoal[]),
    );
  return ok({
    ...day,
    projects: [
      ...candidates.projects.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color ?? null,
        logo: p.logo ?? null,
        companyId: p.companyId,
        companyName: p.companyName,
        ...(p.isPersonal && { isPersonal: true }),
        goals: goalsOf(p.id),
      })),
      ...extra.map((p: { id: string }) => ({ ...p, goals: goalsOf(p.id) })),
    ],
    companies: candidates.companies,
  });
}
