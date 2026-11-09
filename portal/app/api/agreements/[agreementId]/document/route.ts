import { agreementFailure, loadAgreement } from '@/lib/agreements/server';
import { sourceLink } from '@/lib/agreements/source';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * The uploaded PDF behind an agreement, as a short-lived storage link:
 * `{ url }` to draw its pages, or `?download=1` to save the original.
 */
export async function GET(
  request: Request,
  { params }: { params: { agreementId: string } },
) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  try {
    const agreement = await loadAgreement(
      actor,
      params.agreementId,
      'agreements:read',
    );
    if (!agreement.document) return fail(404, 'It has no uploaded PDF.');
    const download = new URL(request.url).searchParams.get('download') === '1';
    const url = await sourceLink(agreement.document, !download);
    return download ? Response.redirect(url, 302) : ok({ url });
  } catch (e) {
    return agreementFailure(e);
  }
}
