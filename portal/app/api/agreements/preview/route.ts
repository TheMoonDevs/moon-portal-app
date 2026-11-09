import {
  agreementFailure,
  parseAgreementInput,
  renderAgreement,
  requireAgreements,
  seesConfidential,
} from '@/lib/agreements/server';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * The agreement as signers will read it, without sending: same body as POST.
 * Blanks about a signer the sender left empty come back filled from what the
 * Portal knows about them (`filled`), and what's still missing.
 */
export async function POST(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  try {
    const input = parseAgreementInput(body);
    await requireAgreements(actor, input.companyId, 'agreements:create');
    const {
      title,
      body: text,
      missing,
      filled,
    } = await renderAgreement(input, {
      pay: await seesConfidential(actor, input.companyId),
    });
    return ok({ title, body: text, missing, filled });
  } catch (e) {
    return agreementFailure(e);
  }
}
