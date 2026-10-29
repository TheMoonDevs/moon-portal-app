import { db } from '@/lib/mongodb/db-client';
import {
  approveRequest,
  canReview,
  declineRequest,
} from '@/lib/workspace/projectRequests';
import {
  fail,
  nowIso,
  ok,
  requireCompanyPermission,
} from '@/lib/workspace/server';
import type { ProjectRequest } from '@/models/workspace';
import { PROJECT_REQUEST_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { requestId: string } };

/**
 * Answers a project request: `approve` (creates the project) or `decline`,
 * by someone who may create it; `withdraw` by the person who asked.
 */
export async function PATCH(request: Request, { params }: Params) {
  const body = await request.json().catch(() => ({}));
  const found: ProjectRequest | null = await db.projectRequest.findFirst({
    where: { id: params.requestId },
  });
  const { response, user, access } = await requireCompanyPermission(
    found?.companyId,
    'projects:read',
  );
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  if (!found) return fail(404, 'Request not found.');
  if (found.status !== PROJECT_REQUEST_STATUS.PENDING)
    return fail(409, 'This request was already answered.');

  const note =
    typeof body.note === 'string' ? body.note.trim().slice(0, 1000) : null;

  if (body.action === 'withdraw') {
    if (found.requestedById !== user.id)
      return fail(403, 'Only the person who asked can take it back.');
    const updated = await db.projectRequest.update({
      where: { id: found.id },
      data: {
        status: PROJECT_REQUEST_STATUS.WITHDRAWN,
        updatedAt: nowIso(),
      },
    });
    return ok({ request: updated });
  }

  if (body.action !== 'approve' && body.action !== 'decline')
    return fail(400, 'Say approve, decline or withdraw.');
  if (!(await canReview(user, access, found)))
    return fail(
      403,
      'Only a company owner, or a lead of the project above it, can answer this request.',
    );

  // Claim it first, so two people answering at once make one project.
  const claimed = await db.projectRequest.updateMany({
    where: { id: found.id, status: PROJECT_REQUEST_STATUS.PENDING },
    data: {
      status:
        body.action === 'approve'
          ? PROJECT_REQUEST_STATUS.APPROVED
          : PROJECT_REQUEST_STATUS.DECLINED,
      reviewedById: user.id,
      updatedAt: nowIso(),
    },
  });
  if (!claimed.count) return fail(409, 'This request was already answered.');

  if (body.action === 'approve') {
    const project = await approveRequest(found, user, note);
    return ok({ project });
  }
  const updated = await declineRequest(found, user, note);
  return ok({ request: updated });
}
