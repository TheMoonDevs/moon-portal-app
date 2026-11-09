import { personFacts } from '@/lib/agreements/autofill';
import {
  agreementFailure,
  requireAgreements,
  seesConfidential,
} from '@/lib/agreements/server';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * What the Portal knows about a person, for a template's blanks about them:
 * `?companyId&email`. Keys are `LegalName`, `Title`, `Address`, `Phone`,
 * `DateOfBirth`, `EmergencyContact`, `JoiningDate` and, for people who may
 * see confidential documents, `Pay`.
 */
export async function GET(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const params = new URL(request.url).searchParams;
  const companyId = params.get('companyId');
  const email = params.get('email');
  if (!companyId || !email)
    return fail(400, 'companyId and email are required.');
  try {
    await requireAgreements(actor, companyId, 'agreements:create');
    return ok({
      facts: await personFacts(companyId, email, {
        pay: await seesConfidential(actor, companyId),
      }),
    });
  } catch (e) {
    return agreementFailure(e);
  }
}
