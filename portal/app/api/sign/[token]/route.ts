import { handOver } from '@/lib/agreements/corrections';
import {
  agreementByToken,
  agreementFailure,
  approveAgreement,
  declineAgreement,
  markViewed,
  signAgreement,
  signingState,
} from '@/lib/agreements/server';
import { clientKeyFor, isRateLimited } from '@/lib/hiring/server';
import { originOf } from '@/lib/mcp/tokens';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

type Params = { params: { token: string } };

const NOT_FOUND = 'This link does not exist.';

const metaOf = (request: Request) => ({
  ip:
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip'),
  userAgent: request.headers.get('user-agent'),
});

/**
 * The signer's copy. The link itself is the key; signed in as the signer,
 * it also says whether they have a saved signature to approve with.
 */
export async function GET(_request: Request, { params }: Params) {
  const found = await agreementByToken(params.token);
  if (!found) return fail(404, NOT_FOUND);
  const viewer = await getSessionUser().catch(() => null);
  return ok({
    state: await signingState(found.agreement, params.token, viewer),
  });
}

/**
 * `{ action: 'view' }` notes that the signer opened it;
 * `{ action: 'sign', name, agree, image?, hash, save?, values? }` signs (and,
 * signed in as the signer, saves the signature for next time), with what
 * they filled in;
 * `{ action: 'approve', values? }` signs with the saved signature, signed in;
 * `{ action: 'handover', name, email, reason? }` passes it to a colleague;
 * `{ action: 'decline', reason? }` declines.
 */
export async function PUT(request: Request, { params }: Params) {
  if (isRateLimited(clientKeyFor(request)))
    return fail(429, 'Too many tries from here. Try again later.');
  const body = await request.json().catch(() => ({}));
  const meta = metaOf(request);
  try {
    const origin = originOf(request);
    if (body.action === 'view') {
      await markViewed(params.token, meta);
      return ok({ viewed: true });
    }
    const viewer = await getSessionUser().catch(() => null);
    let updated;
    if (body.action === 'sign')
      updated = await signAgreement(
        params.token,
        {
          name: body.name,
          agree: body.agree,
          image: body.image,
          hash: body.hash,
          save: body.save,
          values: body.values,
        },
        meta,
        origin,
        viewer,
      );
    else if (body.action === 'approve') {
      if (!viewer)
        return fail(401, 'Sign in to approve with your saved signature.');
      const found = await agreementByToken(params.token);
      if (!found) return fail(404, NOT_FOUND);
      updated = await approveAgreement(
        viewer,
        found.agreement,
        meta,
        origin,
        found.signer.id,
        body.values ?? {},
      );
    } else if (body.action === 'handover') {
      const res = await handOver(
        params.token,
        { name: body.name, email: body.email, reason: body.reason },
        meta,
        origin,
      );
      // Their link is replaced: the page shows that it was handed over.
      return ok({ handedOver: { to: res.to } });
    } else if (body.action === 'decline')
      updated = await declineAgreement(params.token, body.reason, meta, origin);
    else return fail(400, 'Unknown action.');
    return ok({ state: await signingState(updated, params.token, viewer) });
  } catch (e) {
    return agreementFailure(e);
  }
}
