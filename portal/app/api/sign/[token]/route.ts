import { handOver } from '@/lib/agreements/corrections';
import {
  checkSignerCode,
  codeNeeded,
  proofFrom,
  sendSignerCode,
} from '@/lib/agreements/emailCode';
import {
  agreementByToken,
  agreementFailure,
  approveAgreement,
  declineAgreement,
  isSignerUser,
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
export async function GET(request: Request, { params }: Params) {
  const found = await agreementByToken(params.token);
  if (!found) return fail(404, NOT_FOUND);
  const viewer = await getSessionUser().catch(() => null);
  return ok({
    state: await signingState(
      found.agreement,
      params.token,
      viewer,
      proofFrom(request.headers.get('cookie'), found.signer.id),
    ),
  });
}

/**
 * `{ action: 'sendCode' }` emails a code and `{ action: 'checkCode', code }`
 * checks it, when the document asks for one (the right code sets a cookie
 * that opens it for 12 hours);
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
    const found = await agreementByToken(params.token);
    if (!found) return fail(404, NOT_FOUND);
    // An email code first, when the document asks for one.
    if (body.action === 'sendCode')
      return ok(await sendSignerCode(params.token, meta));
    if (body.action === 'checkCode') {
      const { cookie, proof } = await checkSignerCode(
        params.token,
        body.code,
        meta,
      );
      const viewer = await getSessionUser().catch(() => null);
      const fresh = (await agreementByToken(params.token))!;
      const res = ok({
        state: await signingState(fresh.agreement, params.token, viewer, proof),
      });
      res.headers.append('Set-Cookie', cookie);
      return res;
    }
    const viewer = await getSessionUser().catch(() => null);
    const proof = proofFrom(request.headers.get('cookie'), found.signer.id);
    const signedIn = await isSignerUser(viewer, found.signer);
    if (codeNeeded(found.agreement, found.signer, { proof, signedIn }))
      return fail(403, 'Enter the code sent to your email first.');
    if (body.action === 'view') {
      await markViewed(params.token, meta);
      return ok({ viewed: true });
    }
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
          initials: body.initials,
        },
        meta,
        origin,
        viewer,
        proof,
      );
    else if (body.action === 'approve') {
      if (!viewer)
        return fail(401, 'Sign in to approve with your saved signature.');
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
    return ok({
      state: await signingState(updated, params.token, viewer, proof),
    });
  } catch (e) {
    return agreementFailure(e);
  }
}
