import { agreementFailure, requireAgreements } from '@/lib/agreements/server';
import { saveSettings, settingsView } from '@/lib/agreements/signers';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/** Who signs each document type for the company, and what is confidential. */
export async function GET(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const companyId = new URL(request.url).searchParams.get('companyId');
  if (!companyId) return fail(400, 'companyId is required.');
  try {
    await requireAgreements(actor, companyId, 'agreements:read');
    return ok({ settings: await settingsView(companyId) });
  } catch (e) {
    return agreementFailure(e);
  }
}

/**
 * `{ companyId, signatoryId?, autoReminders?, types?: { [type]: { signer:
 * 'owner' | 'lead' | 'none', confidential } } }`.
 */
export async function PUT(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  const companyId = typeof body?.companyId === 'string' ? body.companyId : '';
  if (!companyId) return fail(400, 'companyId is required.');
  try {
    await requireAgreements(actor, companyId, 'agreements:edit');
    return ok({ settings: await saveSettings(actor, companyId, body) });
  } catch (e) {
    return agreementFailure(e);
  }
}
