import { recentPoints } from '@/lib/progress/myPoints';
import {
  fail,
  getWorkspaceForUser,
  ok,
  requireUser,
} from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * The signed-in user's points over the last 90 days in each of their
 * companies and projects, counted as on the leaderboard. The home page
 * orders each company's projects by these:
 * `{ points: { [companyId]: n }, projects: { [projectId]: n } }`.
 */
export async function GET() {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const workspace = await getWorkspaceForUser(user, { orderByPoints: false });
  const { companies, projects } = await recentPoints(
    user.id,
    workspace.map((c) => c.company.id),
  );
  return ok({ points: companies, projects });
}
