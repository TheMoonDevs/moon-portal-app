import { codeNeeded, proofFrom } from '@/lib/agreements/emailCode';
import {
  agreementByToken,
  agreementFailure,
  isSignerUser,
} from '@/lib/agreements/server';
import { sourceLink } from '@/lib/agreements/source';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * The uploaded PDF a signer is asked to sign, as a short-lived link to
 * storage: `{ url }` for the page to draw it, or `?download=1` to save it.
 */
export async function GET(
  request: Request,
  { params }: { params: { token: string } },
) {
  const found = await agreementByToken(params.token);
  if (!found?.agreement.document) return fail(404, 'This link does not exist.');
  try {
    const viewer = await getSessionUser().catch(() => null);
    if (
      codeNeeded(found.agreement, found.signer, {
        proof: proofFrom(request.headers.get('cookie'), found.signer.id),
        signedIn: await isSignerUser(viewer, found.signer),
      })
    )
      return fail(403, 'Enter the code sent to your email first.');
    const download = new URL(request.url).searchParams.get('download') === '1';
    const url = await sourceLink(found.agreement.document, !download);
    return download ? Response.redirect(url, 302) : ok({ url });
  } catch (e) {
    return agreementFailure(e);
  }
}
