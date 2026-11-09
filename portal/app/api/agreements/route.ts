import {
  agreementFailure,
  agreementView,
  listAgreements,
  parseAgreementInput,
  requireAgreements,
  sendAgreement,
} from '@/lib/agreements/server';
import { originOf } from '@/lib/mcp/tokens';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/** A company's agreements, newest first, onboarding documents included. */
export async function GET(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const companyId = new URL(request.url).searchParams.get('companyId');
  if (!companyId) return fail(400, 'companyId is required.');
  try {
    await requireAgreements(actor, companyId, 'agreements:read');
    return ok({
      agreements: await listAgreements(companyId, originOf(request)),
    });
  } catch (e) {
    return agreementFailure(e);
  }
}

/**
 * Sends an agreement to sign: `{ companyId, title, body, category, signers:
 * [{ name, email, role?, order? }], ordered?, message?, expiresOn?, values?,
 * ccEmails?, templateId? }`.
 */
export async function POST(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  try {
    const origin = originOf(request);
    const { agreement, emailErrors } = await sendAgreement(
      actor,
      parseAgreementInput(body),
      origin,
    );
    return ok({
      agreement: await agreementView(agreement, origin),
      emailErrors,
    });
  } catch (e) {
    return agreementFailure(e);
  }
}
