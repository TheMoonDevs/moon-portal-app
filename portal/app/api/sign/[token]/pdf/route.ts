import { pdfFileName } from '@/lib/agreements/pdf';
import {
  agreementByToken,
  agreementFailure,
  agreementPdf,
} from '@/lib/agreements/server';
import { fail } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/** The signed PDF, for anyone holding a signer's link, once it's complete. */
export async function GET(
  _request: Request,
  { params }: { params: { token: string } },
) {
  const found = await agreementByToken(params.token);
  if (!found) return fail(404, 'This link does not exist.');
  if (found.agreement.status !== 'COMPLETED')
    return fail(409, 'The PDF is ready once everyone has signed.');
  try {
    const bytes = await agreementPdf(found.agreement);
    return new Response(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfFileName(found.agreement.title)}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    return agreementFailure(e);
  }
}
