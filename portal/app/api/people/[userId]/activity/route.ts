import { getPerson, loadActivity } from '@/lib/people/server';
import { requireAuthedPermission } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

type Params = { params: { userId: string } };

/** Points a person logged each day over the last six months. */
export async function GET(_request: Request, { params }: Params) {
  const { response, user } = await requireAuthedPermission('worklogs:read');
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  const person = await getPerson(params.userId);
  if (!person) return fail(404, 'Person not found.');
  return ok(await loadActivity(user, person.id), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
