import {
  OnboardError,
  onboardHire,
  onboardingContext,
} from '@/lib/hiring/onboarding';
import { requireApplicationPermission } from '@/lib/hiring/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

type Params = { params: { applicationId: string } };

/** What onboarding a hire would do: their account, projects, buddy. */
export async function GET(_request: Request, { params }: Params) {
  const { response, application, user } = await requireApplicationPermission(
    params.applicationId,
    'hiring:edit',
  );
  if (response || !application || !user)
    return response ?? fail(401, 'Authentication required.');
  return ok(await onboardingContext(user, application));
}

/**
 * Onboards a hire: makes or finds their portal account, adds them to the
 * company and `projectId`, makes `buddyId` their buddy and starts the
 * `checklist` as first-week tasks. `{ projectId?, buddyId?, checklist? }`.
 */
export async function POST(request: Request, { params }: Params) {
  const { response, application, user } = await requireApplicationPermission(
    params.applicationId,
    'hiring:edit',
  );
  if (response || !application || !user)
    return response ?? fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  try {
    return ok(await onboardHire(user, application, body));
  } catch (err) {
    if (err instanceof OnboardError) return fail(err.status, err.message);
    throw err;
  }
}
