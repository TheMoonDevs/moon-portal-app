import { verifyDocument } from '@/lib/agreements/seal';
import { agreementFailure } from '@/lib/agreements/server';
import { clientKeyFor, isRateLimited } from '@/lib/hiring/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * Checks a signed copy, for anyone: `?hash=<SHA-256 of the PDF>` (worked
 * out in the browser; the file never leaves it) and/or `?id=<Envelope ID>`.
 */
export async function GET(request: Request) {
  if (isRateLimited(`verify:${clientKeyFor(request)}`))
    return fail(429, 'Too many checks from here. Try again in a few minutes.');
  const params = new URL(request.url).searchParams;
  try {
    return ok({
      result: await verifyDocument({
        id: params.get('id'),
        hash: params.get('hash'),
      }),
    });
  } catch (e) {
    return agreementFailure(e);
  }
}
