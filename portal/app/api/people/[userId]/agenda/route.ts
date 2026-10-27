import { getPerson, loadAgenda } from '@/lib/people/server';
import { fail, ok, requireUser } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

type Params = { params: { userId: string } };

/**
 * What is ahead for a person: open tasks, plan steps, plans and repeating
 * tasks in the companies the caller shares with them, and on their own page
 * their meetings.
 */
export async function GET(_request: Request, { params }: Params) {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  const person = await getPerson(params.userId);
  if (!person) return fail(404, 'Person not found.');
  return ok(await loadAgenda(user, person), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
