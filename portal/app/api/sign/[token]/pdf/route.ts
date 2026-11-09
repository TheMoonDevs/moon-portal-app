import { pdfFileName } from '@/lib/agreements/pdf';
import { pdfResponse, sealedPdf } from '@/lib/agreements/seal';
import { agreementByToken, agreementFailure } from '@/lib/agreements/server';
import { originOf } from '@/lib/mcp/tokens';
import { fail } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/** The signed PDF, for anyone holding a signer's link, once it's complete. */
export async function GET(
  request: Request,
  { params }: { params: { token: string } },
) {
  const found = await agreementByToken(params.token);
  if (!found) return fail(404, 'This link does not exist.');
  if (found.agreement.status !== 'COMPLETED')
    return fail(409, 'The PDF is ready once everyone has signed.');
  try {
    const { bytes, sealed } = await sealedPdf(
      found.agreement,
      originOf(request),
    );
    return pdfResponse(
      bytes,
      sealed,
      pdfFileName(found.agreement.title),
      new URL(request.url).searchParams.get('inline') === '1',
    );
  } catch (e) {
    return agreementFailure(e);
  }
}
