import type { NextRequest } from 'next/server';

import { getPerson, loadWork, readRange } from '@/lib/people/server';
import { requireAuthedPermission } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

type Params = { params: { userId: string } };

/**
 * A person's work points from `?from=` to `?to=` (YYYY-MM-DD, this week by
 * default), with the projects, tasks and companies they went to.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { response, user } = await requireAuthedPermission('worklogs:read');
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  const person = await getPerson(params.userId);
  if (!person) return fail(404, 'Person not found.');

  const q = request.nextUrl.searchParams;
  const { from, to } = readRange(q.get('from'), q.get('to'));
  return ok(await loadWork(user, person, from, to), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
