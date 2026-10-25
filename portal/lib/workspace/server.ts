import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import {
  type CompanyAccess,
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
} from '@/models/workspace';
import { COMPANY_STATUS, MEMBER_STATUS } from '@/models/workspace';

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
    rolePermissions: roles.flatMap((r) => r.permissions ?? []),
  };
}

export interface CompanyGuardResult {
  response: NextResponse | null;
  user: SessionUser | null;
  access: (CompanyAccess & { member: CompanyMember | null }) | null;
}

/**
 * Requires a signed-in user who holds `permission` inside `companyId`, either
 * from their own user-level permissions or from their roles in that company.
 */
export async function requireCompanyPermission(
  companyId: string | null | undefined,
  permission: string,
): Promise<CompanyGuardResult> {
  const user = await getSessionUser();
  if (!user) return { response: unauthenticated(), user: null, access: null };
  if (!companyId) {
    return { response: fail(400, 'companyId is required.'), user, access: null };
  }
  const company = await db.company.findFirst({ where: { id: companyId } });
  if (!company) {
    return { response: fail(404, 'Company not found.'), user, access: null };
  }
  const access = await getCompanyAccess(user.id, companyId);
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
 * The companies a user can see, each with the company permissions they hold
 * there. Users with `companies:read` at user level see every company.
 */
export async function getWorkspaceForUser(
  user: SessionUser,
  { includeArchived = false } = {},
): Promise<WorkspaceCompany[]> {
  const memberships: CompanyMember[] = await db.companyMember.findMany({
    where: { userId: user.id, status: MEMBER_STATUS.ACTIVE },
  });
  const seesAll = isAllowedInCompany(user, null, 'companies:read');

  const statusFilter = includeArchived
    ? {}
    : { status: COMPANY_STATUS.ACTIVE };
  const companies: Company[] = seesAll
    ? await db.company.findMany({ where: statusFilter, orderBy: { name: 'asc' } })
    : memberships.length
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
    ? await db.companyRole.findMany({ where: { companyId: { in: companyIds } } })
    : [];

  return companies.map((company) => {
    const member = memberships.find((m) => m.companyId === company.id) ?? null;
    const rolePermissions = roles
      .filter(
        (r) => r.companyId === company.id && member?.roleKeys?.includes(r.key),
      )
      .flatMap((r) => r.permissions ?? []);
    return {
      company,
      member,
      permissions: getEffectiveCompanyPermissions(user, { rolePermissions }),
    };
  });
}

/** Creates the default roles for a freshly created company. */
export async function seedCompanyRoles(companyId: string) {
  const createdAt = nowIso();
  await db.companyRole.createMany({
    data: DEFAULT_COMPANY_ROLES.map((role) => ({
      companyId,
      key: role.key,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystem: true,
      createdAt,
      updatedAt: createdAt,
    })),
  });
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
  return db.companyRole.findMany({
    where: { companyId, key: { in: roleKeys } },
  });
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
