import { importApplications } from '@/lib/hiring/importApplications';
import { MAX_IMPORT_ROWS } from '@/lib/hiring/importRows';
import { isStage, requireOpeningPermission } from '@/lib/hiring/server';
import { fail, ok } from '@/lib/workspace/server';
import { APPLICATION_STAGE, JOB_OPENING_STATUS } from '@/models/hiring';

export const dynamic = 'force-dynamic';

type Params = { params: { openingId: string } };

/**
 * Adds applicants from an earlier sheet:
 * `{ rows: ImportRow[], stage?, source? }`, up to 500 rows at a time.
 * People already in the opening are left as they are.
 */
export async function POST(request: Request, { params }: Params) {
  const { response, user, opening } = await requireOpeningPermission(
    params.openingId,
    'hiring:edit',
  );
  if (response || !user || !opening)
    return response ?? fail(401, 'Authentication required.');
  if (opening.status === JOB_OPENING_STATUS.ARCHIVED)
    return fail(400, 'This opening is archived.');

  const body = await request.json().catch(() => ({}));
  if (!Array.isArray(body.rows) || !body.rows.length)
    return fail(400, 'There are no rows to import.');
  if (body.rows.length > MAX_IMPORT_ROWS)
    return fail(400, `Import at most ${MAX_IMPORT_ROWS} rows at a time.`);
  if (body.stage !== undefined && !isStage(body.stage))
    return fail(400, 'Unknown stage.');

  const result = await importApplications(user.id, opening, body.rows, {
    defaultStage: body.stage ?? APPLICATION_STAGE.APPLIED,
    source:
      typeof body.source === 'string' ? body.source.trim().slice(0, 120) : null,
  });
  return ok(result);
}
