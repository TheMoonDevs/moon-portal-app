import type { NextRequest } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { hasPermission } from '@/lib/permissions/matching';
import { APPROVE, leadsAbove } from '@/lib/workspace/projectRequests';
import {
  fail,
  getPublicUsers,
  getWorkspaceForUser,
  ok,
  requireUser,
} from '@/lib/workspace/server';
import type { ProjectRequest } from '@/models/workspace';
import { PROJECT_REQUEST_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

/** Answered requests of the caller's own stay listed this long. */
const ANSWERED_DAYS = 14;

/**
 * Project requests the caller should see (in `?companyId=`, or in every
 * company): pending ones they can approve, and their own. Each carries
 * `canReview`.
 */
export async function GET(request: NextRequest) {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  const only = request.nextUrl.searchParams.get('companyId');

  const workspace = (await getWorkspaceForUser(user)).filter(
    (w) =>
      (!only || w.company.id === only) &&
      hasPermission(w.permissions, 'projects:read'),
  );
  const companyIds = workspace.map((w) => w.company.id);
  if (!companyIds.length) return ok({ requests: [], users: [] });

  const since = new Date(Date.now() - ANSWERED_DAYS * 86400000).toISOString();
  const [requests, projects]: [
    ProjectRequest[],
    { id: string; parentId?: string | null; leadIds?: string[] }[],
  ] = await Promise.all([
    db.projectRequest.findMany({
      where: {
        companyId: { in: companyIds },
        OR: [
          { status: PROJECT_REQUEST_STATUS.PENDING },
          { requestedById: user.id, updatedAt: { gte: since } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.project.findMany({
      where: { companyId: { in: companyIds } },
      select: { parentId: true, leadIds: true },
    }),
  ]);

  const approves = new Set(
    workspace
      .filter((w) => hasPermission(w.permissions, APPROVE))
      .map((w) => w.company.id),
  );
  const shown = requests
    .map((r) => ({
      ...r,
      canReview:
        r.status === PROJECT_REQUEST_STATUS.PENDING &&
        (approves.has(r.companyId) ||
          leadsAbove(projects, r.parentId ?? null).has(user.id)),
    }))
    .filter((r) => r.canReview || r.requestedById === user.id);

  const users = await getPublicUsers(
    shown.flatMap((r) => [r.requestedById, r.reviewedById ?? '']),
  );
  return ok({ requests: shown, users });
}
