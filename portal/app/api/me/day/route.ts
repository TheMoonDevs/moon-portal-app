import { mergeCopies } from '@/lib/daywork/duplicates';
import { isDay, loadDay } from '@/lib/daywork/server';
import { db } from '@/lib/mongodb/db-client';
import { linkCandidates } from '@/lib/worklogs/linker';
import { fail, ok, requireUser } from '@/lib/workspace/server';

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
  const [day, candidates] = await Promise.all([
    loadDay(user.id, date),
    linkCandidates(user),
  ]);
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
        },
      })
    : [];
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
      })),
      ...extra,
    ],
    companies: candidates.companies,
  });
}
