import { pdfFileName } from '@/lib/agreements/pdf';
import { agreementFailure } from '@/lib/agreements/server';
import { documentPdfFor, importedPdfLink } from '@/lib/agreements/vault';
import { getSessionUser } from '@/lib/permissions/server';
import { fail } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * A signed document as a PDF: `?ref=<agreement id>`,
 * `?ref=onboarding:<hire>:<document>`, or `?ref=import:<id>` for one signed
 * before the Portal (sent on to a short-lived storage link). `&inline=1`
 * opens it in the browser.
 */
export async function GET(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const params = new URL(request.url).searchParams;
  const ref = params.get('ref') ?? '';
  try {
    const imported = await importedPdfLink(
      actor,
      ref,
      params.get('inline') === '1',
    );
    if (imported) return Response.redirect(imported, 302);
    const pdf = await documentPdfFor(actor, ref);
    return new Response(Buffer.from(pdf.bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${params.get('inline') === '1' ? 'inline' : 'attachment'}; filename="${pdfFileName(pdf.title)}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    return agreementFailure(e);
  }
}
