import { originOf } from '@/lib/mcp/tokens';
import { db } from '@/lib/mongodb/db-client';
import { onboardingFailure } from '@/lib/onboarding/http';
import { requireInCompany, startOnboarding } from '@/lib/onboarding/server';
import { hireView, onboardingBoard } from '@/lib/onboarding/view';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';
import type { Onboarding } from '@/models/onboarding';

export const dynamic = 'force-dynamic';

/**
 * A company's hires in onboarding, newest first, with the people, projects
 * and hired applicants the Onboarding tab offers to start with.
 */
export async function GET(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const companyId = new URL(request.url).searchParams.get('companyId');
  if (!companyId) return fail(400, 'companyId is required.');
  try {
    await requireInCompany(actor, companyId, 'hiring:read');
    const origin = originOf(request);
    const rows: Onboarding[] = await db.onboarding.findMany({
      where: { companyId },
      orderBy: { updatedAt: 'desc' },
      take: 300,
    });
    const [hires, board] = await Promise.all([
      Promise.all(rows.map((o) => hireView(o, actor, origin))),
      onboardingBoard(companyId),
    ]);
    return ok({ hires, ...board });
  } catch (e) {
    return onboardingFailure(e);
  }
}

/**
 * Starts onboarding and emails the details form:
 * `{ companyId, applicationId? | name + email, terms? }`.
 */
export async function POST(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  if (typeof body.companyId !== 'string')
    return fail(400, 'companyId is required.');
  try {
    const origin = originOf(request);
    const { onboarding, emailError } = await startOnboarding(
      actor,
      {
        companyId: body.companyId,
        applicationId:
          typeof body.applicationId === 'string' ? body.applicationId : null,
        name: body.name,
        email: body.email,
        terms: body.terms && typeof body.terms === 'object' ? body.terms : null,
      },
      origin,
    );
    return ok({ hire: await hireView(onboarding, actor, origin), emailError });
  } catch (e) {
    return onboardingFailure(e);
  }
}
