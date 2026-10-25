import {
  countByStage,
  emptyStageCounts,
  parseOpeningInput,
  requireOpeningPermission,
  statusTimestamps,
} from '@/lib/hiring/server';
import { db } from '@/lib/mongodb/db-client';
import { fail, nowIso, ok } from '@/lib/workspace/server';
import { JOB_OPENING_STATUS } from '@/models/hiring';

export const dynamic = 'force-dynamic';

type Params = { params: { openingId: string } };

export async function GET(_request: Request, { params }: Params) {
  const { response, opening } = await requireOpeningPermission(
    params.openingId,
    'hiring:read',
  );
  if (response || !opening)
    return response ?? fail(401, 'Authentication required.');

  const counts = await countByStage([opening.id]);
  return ok({
    opening: { ...opening, counts: counts[opening.id] ?? emptyStageCounts() },
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { response, opening } = await requireOpeningPermission(
    params.openingId,
    'hiring:edit',
  );
  if (response || !opening)
    return response ?? fail(401, 'Authentication required.');

  const body = await request.json().catch(() => ({}));
  const { data, error } = parseOpeningInput(body);
  if (error) return fail(400, error);

  const statusChanged = !!data.status && data.status !== opening.status;
  const updated = await db.jobOpening.update({
    where: { id: opening.id },
    data: {
      ...data,
      ...(statusChanged && statusTimestamps(data.status, opening)),
      updatedAt: nowIso(),
    },
  });
  const counts = await countByStage([opening.id]);
  return ok({
    opening: { ...updated, counts: counts[opening.id] ?? emptyStageCounts() },
  });
}

/** Archives the opening; its applications are kept. */
export async function DELETE(_request: Request, { params }: Params) {
  const { response, opening } = await requireOpeningPermission(
    params.openingId,
    'hiring:delete',
  );
  if (response || !opening)
    return response ?? fail(401, 'Authentication required.');

  const updated = await db.jobOpening.update({
    where: { id: opening.id },
    data: {
      status: JOB_OPENING_STATUS.ARCHIVED,
      closedAt: opening.closedAt ?? nowIso(),
      updatedAt: nowIso(),
    },
  });
  return ok({ opening: updated });
}
