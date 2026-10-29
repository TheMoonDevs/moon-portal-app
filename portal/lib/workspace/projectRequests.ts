import { db } from '@/lib/mongodb/db-client';
import { ensureNotificationsReset } from '@/lib/notifications/server';
import {
  type CompanyAccess,
  companyRolePermissions,
  isAllowedInCompany,
} from '@/lib/permissions/company';
import { hasPermission } from '@/lib/permissions/matching';
import type { SessionUser } from '@/lib/permissions/server';
import { sendPushToUsers } from '@/lib/push/server';
import { NotificationType } from '@/models/shared/enums';
import type {
  CompanyMember,
  CompanyRole,
  Project,
  ProjectRequest,
} from '@/models/workspace';
import {
  MEMBER_STATUS,
  PROJECT_EFFORT,
  PROJECT_REQUEST_STATUS,
  PROJECT_STATUS,
} from '@/models/workspace';

import { syncGoalSchedules } from './goalSchedules';
import { leadsAbove } from './projectProgress';
import { sanitizeGoals } from './projects';
import { asStringArray, nowIso, slugify } from './server';

/*
 * Who may create a project, and requests for the rest. Anyone with
 * `projects:approve` in the company (its owners) creates projects straight
 * away. A lead of a project creates sub-projects under it, at any depth.
 * Everyone else sends a request; an owner, or a lead of the project it
 * would sit under, approves it and the project is made with the person who
 * asked as its lead.
 */

export const APPROVE = 'projects:approve';

type Tree = { id: string; parentId?: string | null; leadIds?: string[] }[];

export { leadsAbove };

/**
 * Whether the person may create a project (under `parentId`, if any)
 * without asking: they approve projects in the company, or lead the parent
 * or a project above it.
 */
export async function canCreateDirectly(
  user: SessionUser,
  access: CompanyAccess | null,
  companyId: string,
  parentId: string | null,
) {
  if (isAllowedInCompany(user, access, APPROVE)) return true;
  if (!parentId) return false;
  const projects: Tree = await db.project.findMany({
    where: { companyId },
    select: { parentId: true, leadIds: true },
  });
  return leadsAbove(projects, parentId).has(user.id);
}

/** Whether the person may approve or decline this request. */
export async function canReview(
  user: SessionUser,
  access: CompanyAccess | null,
  request: Pick<ProjectRequest, 'companyId' | 'parentId'>,
) {
  return canCreateDirectly(
    user,
    access,
    request.companyId,
    request.parentId ?? null,
  );
}

export type NewProject = {
  companyId: string;
  name: string;
  description?: string | null;
  aliases?: string[];
  status?: PROJECT_STATUS;
  color?: string | null;
  icon?: string | null;
  logo?: string | null;
  leadIds?: unknown;
  memberIds?: unknown;
  goals?: unknown;
  effort?: PROJECT_EFFORT | null;
  parentId?: string | null;
};

/** Creates a project and sets up its goals' scheduled tasks. */
export async function createProject(input: NewProject, userId: string) {
  const now = nowIso();
  const project: Project = await db.project.create({
    data: {
      companyId: input.companyId,
      name: input.name,
      slug: slugify(input.name),
      description: input.description ?? null,
      ...(input.aliases?.length && { aliases: input.aliases }),
      status: input.status ?? PROJECT_STATUS.ACTIVE,
      color: input.color ?? null,
      icon: input.icon ?? null,
      logo: input.logo || null,
      leadIds: asStringArray(input.leadIds),
      memberIds: asStringArray(input.memberIds),
      goals: sanitizeGoals(input.goals),
      effort: input.effort ?? PROJECT_EFFORT.MEDIUM,
      parentId: input.parentId ?? null,
      createdById: userId,
      createdAt: now,
      updatedAt: now,
    },
  });
  if (project.goals?.length) await syncGoalSchedules(project, [], userId);
  return project;
}

/** Files a request for a project the person may not create themselves. */
export async function requestProject(
  input: NewProject & { note?: string | null },
  user: SessionUser,
) {
  const now = nowIso();
  const request: ProjectRequest = await db.projectRequest.create({
    data: {
      companyId: input.companyId,
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? null,
      effort: input.effort ?? null,
      parentId: input.parentId ?? null,
      note: input.note ?? null,
      status: PROJECT_REQUEST_STATUS.PENDING,
      requestedById: user.id,
      reviewedById: null,
      reviewedAt: null,
      reviewNote: null,
      projectId: null,
      createdAt: now,
      updatedAt: now,
    },
  });
  const reviewers = await reviewersFor(request);
  await notify(
    Array.from(reviewers).filter((id) => id !== user.id),
    request,
    `${user.name || 'Someone'} asked for a project: ${request.name}`,
    request.note || 'Approve or decline it on the Projects page.',
    true,
  );
  return request;
}

/**
 * Approves a request: the project is made, led by the person who asked.
 * Returns the project.
 */
export async function approveRequest(
  request: ProjectRequest,
  reviewer: SessionUser,
  note?: string | null,
) {
  // The parent may have gone since; the project then sits at the top.
  const parent = request.parentId
    ? await db.project.findFirst({
        where: { id: request.parentId, companyId: request.companyId },
      })
    : null;
  const project = await createProject(
    {
      companyId: request.companyId,
      name: request.name,
      description: request.description,
      color: request.color,
      effort: request.effort,
      parentId: parent?.id ?? null,
      leadIds: [request.requestedById],
    },
    reviewer.id,
  );
  await db.projectRequest.update({
    where: { id: request.id },
    data: {
      status: PROJECT_REQUEST_STATUS.APPROVED,
      reviewedById: reviewer.id,
      reviewedAt: nowIso(),
      reviewNote: note ?? null,
      projectId: project.id,
      updatedAt: nowIso(),
    },
  });
  await settle(request.id);
  await notify(
    [request.requestedById],
    request,
    `${request.name} was approved`,
    note || 'The project is ready, with you as its lead.',
    false,
    `/projects/${project.id}`,
  );
  return project;
}

export async function declineRequest(
  request: ProjectRequest,
  reviewer: SessionUser,
  note?: string | null,
) {
  const updated: ProjectRequest = await db.projectRequest.update({
    where: { id: request.id },
    data: {
      status: PROJECT_REQUEST_STATUS.DECLINED,
      reviewedById: reviewer.id,
      reviewedAt: nowIso(),
      reviewNote: note ?? null,
      updatedAt: nowIso(),
    },
  });
  await settle(request.id);
  await notify(
    [request.requestedById],
    request,
    `${request.name} was not approved`,
    note || 'Ask the company owner if you want to know more.',
    false,
  );
  return updated;
}

/* ------------------------------ notifications ----------------------------- */

/**
 * Who can approve a request: members whose roles hold `projects:approve`,
 * and the leads of the project it would sit under.
 */
async function reviewersFor(request: ProjectRequest) {
  const [members, roles, projects]: [CompanyMember[], CompanyRole[], Tree] =
    await Promise.all([
      db.companyMember.findMany({
        where: { companyId: request.companyId, status: MEMBER_STATUS.ACTIVE },
      }),
      db.companyRole.findMany({ where: { companyId: request.companyId } }),
      request.parentId
        ? db.project.findMany({
            where: { companyId: request.companyId },
            select: { parentId: true, leadIds: true },
          })
        : Promise.resolve([]),
    ]);
  const approving = new Set(
    roles
      .filter((r) => hasPermission(companyRolePermissions(r), APPROVE))
      .map((r) => r.key),
  );
  const ids = new Set(
    members
      .filter((m) => m.roleKeys?.some((k) => approving.has(k)))
      .map((m) => m.userId),
  );
  leadsAbove(projects, request.parentId ?? null).forEach((id) => ids.add(id));
  return ids;
}

const MATCH_TYPE = 'ProjectRequest';

async function notify(
  userIds: string[],
  request: ProjectRequest,
  title: string,
  description: string,
  needsAction: boolean,
  url = `/projects?request=${request.id}`,
) {
  if (!userIds.length) return;
  await ensureNotificationsReset();
  const at = new Date();
  await db.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      title,
      description,
      matchId: request.id,
      matchType: MATCH_TYPE,
      notificationType: NotificationType.SELF_GENERATED,
      notificationData: {
        kind: 'PROJECT_REQUEST',
        requestId: request.id,
        actions: [
          {
            title: needsAction ? 'Review' : 'Open',
            trigger_type: 'link',
            trigger: url,
          },
        ],
        actionDone: !needsAction,
      },
      isRead: false,
      createdAt: at,
      updatedAt: at,
    })),
  });
  await sendPushToUsers(userIds, {
    title,
    body: description,
    url,
    tag: `project-request-${request.id}`,
  }).catch((e) => console.error('[projects] push failed', e));
}

/** Marks the request's notifications handled. */
async function settle(requestId: string) {
  await db.notification.updateMany({
    where: { matchId: requestId, matchType: MATCH_TYPE },
    data: { 'notificationData.actionDone': true, updatedAt: new Date() },
  });
}
