import {
  agreementFailure,
  parseAgreementInput,
  renderAgreement,
  requireAgreements,
} from '@/lib/agreements/server';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/** The agreement as signers will read it, without sending: same body as POST. */
export async function POST(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  try {
    const input = parseAgreementInput(body);
    await requireAgreements(actor, input.companyId, 'agreements:create');
    const { title, body: text, missing } = await renderAgreement(input);
    return ok({ title, body: text, missing });
  } catch (e) {
    return agreementFailure(e);
  }
}
