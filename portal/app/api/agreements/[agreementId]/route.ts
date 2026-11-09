import {
  correctSigner,
  correctText,
  setEndDate,
} from '@/lib/agreements/corrections';
import {
  agreementDetail,
  agreementFailure,
  deleteAgreement,
  loadAgreement,
  remindSigners,
  voidAgreement,
} from '@/lib/agreements/server';
import { originOf } from '@/lib/mcp/tokens';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

type Params = { params: { agreementId: string } };

/** One agreement in full: text, signatures and audit trail. */
export async function GET(request: Request, { params }: Params) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  try {
    const agreement = await loadAgreement(
      actor,
      params.agreementId,
      'agreements:read',
    );
    return ok({
      agreement: await agreementDetail(agreement, originOf(request)),
    });
  } catch (e) {
    return agreementFailure(e);
  }
}

/**
 * `{ action: 'remind', signerId? }` emails the people whose turn it is again;
 * `{ action: 'void', reason? }` withdraws it;
 * `{ action: 'correct-signer', signerId, name, email, note? }` fixes a
 * signer before they sign (a new email gets a new link);
 * `{ action: 'correct-text', title, body, note? }` fixes the text while it's
 * out (anyone who signed signs again);
 * `{ action: 'end-date', endsOn }` sets when it ends, for the alerts.
 */
export async function PUT(request: Request, { params }: Params) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  try {
    const origin = originOf(request);
    const agreement = await loadAgreement(
      actor,
      params.agreementId,
      'agreements:edit',
    );
    if (body.action === 'remind') {
      const res = await remindSigners(
        actor,
        agreement,
        typeof body.signerId === 'string' ? body.signerId : null,
        origin,
      );
      return ok({
        agreement: await agreementDetail(res.agreement, origin),
        emailErrors: res.emailErrors,
      });
    }
    if (body.action === 'correct-signer') {
      const res = await correctSigner(
        actor,
        agreement,
        String(body.signerId ?? ''),
        { name: body.name, email: body.email, note: body.note },
        origin,
      );
      return ok({
        agreement: await agreementDetail(res.agreement, origin),
        emailErrors: res.emailErrors,
      });
    }
    if (body.action === 'correct-text') {
      const res = await correctText(
        actor,
        agreement,
        { title: body.title, body: body.body, note: body.note },
        origin,
      );
      return ok({
        agreement: await agreementDetail(res.agreement, origin),
        emailErrors: res.emailErrors,
        signAgain: res.signAgain,
      });
    }
    if (body.action === 'end-date') {
      const updated = await setEndDate(actor, agreement, body.endsOn ?? null);
      return ok({ agreement: await agreementDetail(updated, origin) });
    }
    if (body.action === 'void') {
      const updated = await voidAgreement(
        actor,
        agreement,
        body.reason,
        origin,
      );
      return ok({ agreement: await agreementDetail(updated, origin) });
    }
    return fail(400, 'Unknown action.');
  } catch (e) {
    return agreementFailure(e);
  }
}

/** Deletes a withdrawn, declined or expired agreement. */
export async function DELETE(_request: Request, { params }: Params) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  try {
    const agreement = await loadAgreement(
      actor,
      params.agreementId,
      'agreements:delete',
    );
    await deleteAgreement(actor, agreement);
    return ok({ deleted: true });
  } catch (e) {
    return agreementFailure(e);
  }
}
