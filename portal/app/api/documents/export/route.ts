import { agreementFailure } from '@/lib/agreements/server';
import {
  parseVaultFilters,
  searchVault,
  vaultCsv,
  vaultZip,
} from '@/lib/agreements/vault';
import { originOf } from '@/lib/mcp/tokens';
import { getSessionUser } from '@/lib/permissions/server';
import { fail } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Exports what the vault shows for the same filters: `&format=csv` as a
 * spreadsheet, `&format=zip` as the signed PDFs (up to 150) with an index.
 */
export async function GET(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const params = new URL(request.url).searchParams;
  const companyId = params.get('companyId');
  if (!companyId) return fail(400, 'companyId is required.');
  const format = params.get('format') === 'zip' ? 'zip' : 'csv';
  try {
    const rows = await searchVault(
      actor,
      companyId,
      parseVaultFilters(params),
      originOf(request),
    );
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'csv')
      return new Response(vaultCsv(rows), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="documents-${stamp}.csv"`,
          'Cache-Control': 'private, no-store',
        },
      });
    const zip = await vaultZip(rows, originOf(request));
    return new Response(Buffer.from(zip), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="signed-documents-${stamp}.zip"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    return agreementFailure(e);
  }
}
