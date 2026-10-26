import {
  isStage,
  moveApplication,
  requireApplicationPermission,
} from '@/lib/hiring/server';
import { db } from '@/lib/mongodb/db-client';
import { fail, nowIso, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

type Params = { params: { applicationId: string } };

const MAX_NOTES = 10000;

export async function GET(_request: Request, { params }: Params) {
  const { response, application } = await requireApplicationPermission(
    params.applicationId,
    'hiring:read',
  );
  if (response || !application)
    return response ?? fail(401, 'Authentication required.');
  return ok({ application });
}

/** Changes the stage and/or HR's notes: `{ stage?, notes? }`. */
export async function PATCH(request: Request, { params }: Params) {
  const { response, application, user } = await requireApplicationPermission(
    params.applicationId,
    'hiring:edit',
  );
  if (response || !application || !user)
    return response ?? fail(401, 'Authentication required.');

  const body = await request.json().catch(() => ({}));
  if ('stage' in body && !isStage(body.stage))
    return fail(400, 'Unknown stage.');

  let updated = application;
  if ('notes' in body) {
    const notes =
      typeof body.notes === 'string' ? body.notes.slice(0, MAX_NOTES) : '';
    updated = await db.jobApplication.update({
      where: { id: application.id },
      data: { notes: notes || null, updatedAt: nowIso() },
    });
  }
  if (isStage(body.stage))
    updated = await moveApplication(updated, body.stage, user.id);

  return ok({ application: updated });
}
