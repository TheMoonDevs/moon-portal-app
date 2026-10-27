import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { ALL_COMPANY_PERMISSIONS } from '@/lib/permissions/catalog';
import {
  type CompanyAccess,
  companyRolePermissions,
  DEFAULT_COMPANY_ROLES,
  getEffectiveCompanyPermissions,
  isAllowedInCompany,
} from '@/lib/permissions/company';
import {
  getSessionUser,
  permissionDeniedResponse,
  type SessionUser,
} from '@/lib/permissions/server';
import type {
  Company,
  CompanyMember,
  CompanyRole,
  ProjectGoal,
} from '@/models/workspace';
import {
  COMPANY_STATUS,
  MEMBER_STATUS,
  PROJECT_EFFORT,
} from '@/models/workspace';

/* ------------------------------- responses ------------------------------- */

export const ok = (data: unknown, init?: ResponseInit) =>
  NextResponse.json({ status: 'success', data }, init);

export const fail = (status: number, error: string) =>
  NextResponse.json({ status: 'fail', error }, { status });

const unauthenticated = () => fail(401, 'Authentication required.');

/* --------------------------------- utils --------------------------------- */

export const nowIso = () => new Date().toISOString();

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'item';

export const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? Array.from(
        new Set(value.filter((v): v is string => typeof v === 'string')),
      )
    : [];

/** Picks only the listed keys from an untrusted request body. */
export function pick<T extends Record<string, unknown>>(
  body: T,
  keys: readonly string[],
): Partial<T> {
  const out: Partial<T> = {};
  for (const key of keys) {
    if (key in body) (out as Record<string, unknown>)[key] = body[key];
  }
  return out;
}

/* ------------------------------- membership ------------------------------ */

export async function getMembership(
  userId: string,
  companyId: string,
): Promise<CompanyMember | null> {
  return db.companyMember.findFirst({
    where: { userId, companyId, status: MEMBER_STATUS.ACTIVE },
  });
}

export async function getCompanyAccess(
  userId: string,
  companyId: string,
): Promise<(CompanyAccess & { member: CompanyMember | null }) | null> {
  const member = await getMembership(userId, companyId);
  if (!member) return { member: null, rolePermissions: [] };
  const roles: CompanyRole[] = member.roleKeys?.length
    ? await db.companyRole.findMany({
        where: { companyId, key: { in: member.roleKeys } },
      })
    : [];
  return {
    member,
    rolePermissions: roles.flatMap((r) => companyRolePermissions(r)),
  };
}

export interface CompanyGuardResult {
  response: NextResponse | null;
  user: SessionUser | null;
  access: (CompanyAccess & { member: CompanyMember | null }) | null;
}

/**
 * Requires a signed-in member of `companyId` who holds `permission` there,
 * from their roles in the company or their own user-level permissions.
 */
export async function requireCompanyPermission(
  companyId: string | null | undefined,
  permission: string,
): Promise<CompanyGuardResult> {
  const user = await getSessionUser();
  if (!user) return { response: unauthenticated(), user: null, access: null };
  if (!companyId) {
    return {
      response: fail(400, 'companyId is required.'),
      user,
      access: null,
    };
  }
  const company = await db.company.findFirst({ where: { id: companyId } });
  const access = company ? await getCompanyAccess(user.id, companyId) : null;
  // Only members can see or open a company; to anyone else it does not exist.
  if (!company || !access?.member) {
    return { response: fail(404, 'Company not found.'), user, access: null };
  }
  if (!isAllowedInCompany(user, access, permission)) {
    return { response: permissionDeniedResponse(permission), user, access };
  }
  return { response: null, user, access };
}

/** Requires any signed-in user. */
export async function requireUser(): Promise<{
  response: NextResponse | null;
  user: SessionUser | null;
}> {
  const user = await getSessionUser();
  if (!user) return { response: unauthenticated(), user: null };
  return { response: null, user };
}

/* ------------------------------ workspace view --------------------------- */

export interface WorkspaceCompany {
  company: Company;
  member: CompanyMember | null;
  permissions: string[];
}

/**
 * The companies a user belongs to, each with the company permissions they
 * hold there. Only members see a company, whatever their portal role.
 */
export async function getWorkspaceForUser(
  user: SessionUser,
  { includeArchived = false } = {},
): Promise<WorkspaceCompany[]> {
  const memberships: CompanyMember[] = await db.companyMember.findMany({
    where: { userId: user.id, status: MEMBER_STATUS.ACTIVE },
  });
  const statusFilter = includeArchived ? {} : { status: COMPANY_STATUS.ACTIVE };
  const companies: Company[] = memberships.length
    ? await db.company.findMany({
        where: {
          ...statusFilter,
          id: { in: memberships.map((m) => m.companyId) },
        },
        orderBy: { name: 'asc' },
      })
    : [];

  const companyIds = companies.map((c) => c.id);
  const roles: CompanyRole[] = companyIds.length
    ? await db.companyRole.findMany({
        where: { companyId: { in: companyIds } },
      })
    : [];

  return companies.map((company) => {
    const member = memberships.find((m) => m.companyId === company.id) ?? null;
    const rolePermissions = roles
      .filter(
        (r) => r.companyId === company.id && member?.roleKeys?.includes(r.key),
      )
      .flatMap((r) => companyRolePermissions(r));
    return {
      company,
      member,
      permissions: getEffectiveCompanyPermissions(user, { rolePermissions }),
    };
  });
}

const defaultRoleData = (
  companyId: string,
  roles: typeof DEFAULT_COMPANY_ROLES,
) => {
  const createdAt = nowIso();
  return roles.map((role) => ({
    companyId,
    key: role.key,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    isSystem: true,
    createdAt,
    updatedAt: createdAt,
  }));
};

/** Creates the default roles for a freshly created company. */
export async function seedCompanyRoles(companyId: string) {
  await db.companyRole.createMany({
    data: defaultRoleData(companyId, DEFAULT_COMPANY_ROLES),
  });
}

/**
 * Brings an older company's roles up to date: adds built-in roles that came
 * out after it was created (such as Recruiter) and fills in the Owner role's
 * list. Returns whether anything changed.
 */
export async function syncCompanyRoles(
  companyId: string,
  roles: CompanyRole[],
): Promise<boolean> {
  const missing = DEFAULT_COMPANY_ROLES.filter(
    (role) => !roles.some((r) => r.key === role.key),
  );
  if (missing.length)
    await db.companyRole.createMany({
      data: defaultRoleData(companyId, missing),
    });

  const owner = roles.find((r) => r.key === 'owner');
  const ownerBehind =
    !!owner &&
    ALL_COMPANY_PERMISSIONS.some((p) => !owner.permissions?.includes(p));
  if (owner && ownerBehind)
    await db.companyRole.update({
      where: { id: owner.id },
      data: { permissions: [...ALL_COMPANY_PERMISSIONS], updatedAt: nowIso() },
    });
  return missing.length > 0 || ownerBehind;
}

/* ------------------------------- escalation ------------------------------ */

/**
 * A user may only hand out a role (or put permissions in a role) when they
 * already hold every permission it contains, so nobody can raise their own or
 * someone else's access above theirs.
 */
export function missingForGrant(
  user: SessionUser,
  access: CompanyAccess | null,
  permissions: string[],
): string[] {
  return permissions.filter((p) => !isAllowedInCompany(user, access, p));
}

export async function rolesForKeys(
  companyId: string,
  roleKeys: string[],
): Promise<CompanyRole[]> {
  if (!roleKeys.length) return [];
  const roles: CompanyRole[] = await db.companyRole.findMany({
    where: { companyId, key: { in: roleKeys } },
  });
  return roles.map((role) => ({
    ...role,
    permissions: companyRolePermissions(role),
  }));
}

/* --------------------------------- people -------------------------------- */

/** Public fields of a user, safe to send to any member of a company. */
export const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
  email: true,
  positionTitle: true,
  status: true,
} as const;

export async function getPublicUsers(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) return [];
  return db.user.findMany({
    where: { id: { in: ids } },
    select: PUBLIC_USER_SELECT,
  });
}

/* --------------------------- projects and tasks -------------------------- */

export interface ProgressCounts {
  total: number;
  done: number;
  major: number;
  majorDone: number;
}

/**
 * Task progress per project. Major tasks weigh three times a minor one, so the
 * percentage reflects how much work is left rather than just a task count.
 */
export function summarizeTasks(
  tasks: Array<{ projectId: string; status: string; size: string }>,
) {
  const byProject: Record<string, ProgressCounts & { percent: number }> = {};
  for (const task of tasks) {
    // Tasks set aside do not count towards progress.
    if (task.status === 'IGNORED' || task.status === 'ARCHIVED') continue;
    const row = (byProject[task.projectId] ??= {
      total: 0,
      done: 0,
      major: 0,
      majorDone: 0,
      percent: 0,
    });
    const isDone = task.status === 'DONE';
    row.total += 1;
    if (isDone) row.done += 1;
    if (task.size === 'MAJOR') {
      row.major += 1;
      if (isDone) row.majorDone += 1;
    }
  }
  for (const row of Object.values(byProject)) {
    const weight = (major: number, all: number) => major * 3 + (all - major);
    const total = weight(row.major, row.total);
    row.percent = total
      ? Math.round((weight(row.majorDone, row.done) / total) * 100)
      : 0;
  }
  return byProject;
}

/** Loads a project and checks `permission` in the company that owns it. */
export async function requireProjectPermission(
  projectId: string,
  permission: string,
) {
  const project = await db.project.findFirst({ where: { id: projectId } });
  if (!project) {
    const user = await getSessionUser();
    return {
      response: user ? fail(404, 'Project not found.') : unauthenticated(),
      user,
      access: null,
      project: null,
    };
  }
  const guard = await requireCompanyPermission(project.companyId, permission);
  return { ...guard, project };
}

/**
 * The goal (and part) a task may link to: only goals of its own project,
 * and only parts of that goal. Anything else is cleared.
 */
export function goalLink(
  project: { goals?: ProjectGoal[] | null } | null,
  body: { goalId?: unknown; goalPartId?: unknown },
) {
  const goal = (project?.goals ?? []).find((g) => g.id === body.goalId);
  const part = goal?.parts?.find((p) => p.id === body.goalPartId);
  return { goalId: goal?.id ?? null, goalPartId: part?.id ?? null };
}

/* ------------------------------ project tree ------------------------------ */

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A YYYY-MM-DD day, null for empty, undefined when malformed. */
export const asDay = (value: unknown): string | null | undefined =>
  value === null || value === undefined || value === ''
    ? null
    : typeof value === 'string' && DAY.test(value)
      ? value
      : undefined;

export const asEffort = (value: unknown): PROJECT_EFFORT | null | undefined =>
  value === null || value === undefined || value === ''
    ? null
    : Object.values(PROJECT_EFFORT).includes(value as PROJECT_EFFORT)
      ? (value as PROJECT_EFFORT)
      : undefined;

/**
 * Checks a parent for a project: same company, not the project itself and
 * not one of its own sub-projects. Returns the parent id (null for none),
 * or an error to show.
 */
export async function checkParent(
  companyId: string,
  projectId: string | null,
  parentId: unknown,
): Promise<{ parentId: string | null; error?: string }> {
  if (parentId === null || parentId === undefined || parentId === '')
    return { parentId: null };
  if (typeof parentId !== 'string')
    return { parentId: null, error: 'Unknown parent project.' };
  if (parentId === projectId)
    return { parentId: null, error: 'A project cannot be its own parent.' };
  const projects: { id: string; parentId?: string | null }[] =
    await db.project.findMany({
      where: { companyId },
      select: { parentId: true },
    });
  const byId = new Map(projects.map((p) => [p.id, p]));
  if (!byId.has(parentId))
    return {
      parentId: null,
      error: 'The parent must be a project in the same company.',
    };
  // Walk up from the parent: meeting this project means a loop.
  let at: string | null | undefined = parentId;
  for (let i = 0; at && i < 50; i++) {
    if (at === projectId)
      return {
        parentId: null,
        error: 'That parent is already under this project.',
      };
    at = byId.get(at)?.parentId;
  }
  return { parentId };
}
