import { db } from '@/lib/mongodb/db-client';
import {
  PERSONAL_COMPANY_ID as LEGACY_PERSONAL_ID,
  PERSONAL_NAME,
} from '@/lib/worklogs/personal';
import { seedCompanyRoles } from '@/lib/workspace/server';
import type { Company, Project, Task } from '@/models/workspace';
import {
  COMPANY_STATUS,
  MEMBER_STATUS,
  PROJECT_EFFORT,
  PROJECT_STATUS,
} from '@/models/workspace';

/*
 * Everyone has a PERSONAL of their own: a private company (`isPersonal`)
 * with them as its only member, and one project in it, also called
 * Personal, which is the company's CORE. Being a real company and project,
 * everything a project has works there too: tasks, work logs, plans,
 * goals, pages and the goals calendar. Nobody else can be added to it, and
 * it never shows in leaderboards, the World or anyone else's view of them.
 * It is made the first time the person's workspace is loaded. Server only.
 */

export type PersonalSpace = { company: Company; project: Project };

/** Whether each company is someone's PERSONAL; it never changes, so kept. */
const known = new Map<string, boolean>();

/** Whether this company id is someone's PERSONAL (or the old made-up one). */
export async function isPersonalCompany(
  companyId: string | null | undefined,
): Promise<boolean> {
  if (!companyId) return false;
  if (companyId === LEGACY_PERSONAL_ID) return true;
  const cached = known.get(companyId);
  if (cached !== undefined) return cached;
  const company: Pick<Company, 'id' | 'isPersonal'> | null =
    await db.company.findFirst({
      where: { id: companyId },
      select: { id: true, isPersonal: true },
    });
  const personal = !!company?.isPersonal;
  if (company) known.set(companyId, personal);
  return personal;
}

/** Of these company ids, the ones that are someone's PERSONAL. */
export async function personalCompanyIds(
  companyIds: (string | null | undefined)[],
): Promise<Set<string>> {
  const ids = Array.from(new Set(companyIds.filter(Boolean))) as string[];
  const out = new Set<string>();
  const unknown: string[] = [];
  for (const id of ids) {
    if (id === LEGACY_PERSONAL_ID) out.add(id);
    else if (known.has(id)) {
      if (known.get(id)) out.add(id);
    } else unknown.push(id);
  }
  if (unknown.length) {
    const found: Pick<Company, 'id' | 'isPersonal'>[] =
      await db.company.findMany({
        where: { id: { in: unknown } },
        select: { id: true, isPersonal: true },
      });
    for (const c of found) {
      known.set(c.id, !!c.isPersonal);
      if (c.isPersonal) out.add(c.id);
    }
  }
  return out;
}

/**
 * Seen by its owner only: in a PERSONAL, or on no project or company yet.
 * Its work points are private.
 */
export async function isPrivateTask(
  task: Pick<Task, 'companyId' | 'projectId'>,
): Promise<boolean> {
  if (!task.companyId) return !task.projectId;
  return isPersonalCompany(task.companyId);
}

/** The person's PERSONAL, if it has been made. */
export async function findPersonalSpace(
  userId: string,
): Promise<PersonalSpace | null> {
  const company: Company | null = await db.company.findFirst({
    where: { isPersonal: true, ownerId: userId },
    orderBy: { createdAt: 'asc' },
  });
  if (!company) return null;
  known.set(company.id, true);
  const project: Project | null = await db.project.findFirst({
    where: { companyId: company.id, isCore: true },
  });
  return project ? { company, project } : null;
}

const making = new Map<string, Promise<PersonalSpace>>();

/**
 * The person's PERSONAL, made the first time it is asked for. Their tasks
 * from before, kept under the old made-up Personal company, move into it.
 */
export function ensurePersonalSpace(userId: string): Promise<PersonalSpace> {
  const pending = making.get(userId);
  if (pending) return pending;
  const run = ensure(userId).finally(() => making.delete(userId));
  making.set(userId, run);
  return run;
}

/** When each person's PERSONAL was last checked over on this server. */
const checkedAt = new Map<string, number>();
const RECHECK_MS = 10 * 60 * 1000;

async function ensure(userId: string): Promise<PersonalSpace> {
  const found = await findPersonalSpace(userId);
  if (found) {
    if (Date.now() - (checkedAt.get(userId) ?? 0) > RECHECK_MS) {
      await keepPrivate(found, userId);
      checkedAt.set(userId, Date.now());
    }
    return found;
  }
  const now = new Date().toISOString();
  let company: Company | null = await db.company.findFirst({
    where: { isPersonal: true, ownerId: userId },
    orderBy: { createdAt: 'asc' },
  });
  if (!company) {
    company = await db.company.create({
      data: {
        name: PERSONAL_NAME,
        slug: `personal-${userId}`,
        description: PERSONAL_DESCRIPTION,
        logo: null,
        color: PERSONAL_COLOR,
        status: COMPANY_STATUS.ACTIVE,
        isPersonal: true,
        ownerId: userId,
        createdById: userId,
        createdAt: now,
        updatedAt: now,
      },
    });
    await seedCompanyRoles(company!.id);
    await db.companyMember.create({
      data: {
        companyId: company!.id,
        userId,
        roleKeys: ['owner'],
        status: MEMBER_STATUS.ACTIVE,
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    });
  }
  const theCompany = company!;
  known.set(theCompany.id, true);
  const project: Project =
    (await db.project.findFirst({
      where: { companyId: theCompany.id, isCore: true },
    })) ??
    (await db.project.create({
      data: {
        companyId: theCompany.id,
        name: PERSONAL_NAME,
        slug: 'personal',
        description: PERSONAL_DESCRIPTION,
        status: PROJECT_STATUS.ACTIVE,
        color: PERSONAL_COLOR,
        icon: null,
        logo: null,
        leadIds: [userId],
        memberIds: [],
        goals: [],
        effort: PROJECT_EFFORT.MEDIUM,
        parentId: null,
        isCore: true,
        isPersonal: true,
        createdById: userId,
        createdAt: now,
        updatedAt: now,
      },
    }));
  const space = await settleDuplicates(
    { company: theCompany, project },
    userId,
  );
  await moveOldPersonalTasks(space, userId);
  return space;
}

/**
 * Two requests at once on different servers can each make one; the oldest
 * stays and the other goes, with anything already put in it.
 */
async function settleDuplicates(
  space: PersonalSpace,
  userId: string,
): Promise<PersonalSpace> {
  const all: Company[] = await db.company.findMany({
    where: { isPersonal: true, ownerId: userId },
    orderBy: { createdAt: 'asc' },
  });
  if (all.length < 2) return space;
  const [keep, ...extra] = all;
  const project: Project | null = await db.project.findFirst({
    where: { companyId: keep.id, isCore: true },
  });
  if (!project) return space;
  for (const c of extra) {
    const projects: Project[] = await db.project.findMany({
      where: { companyId: c.id },
    });
    for (const p of projects) {
      await db.task.updateMany({
        where: { projectId: p.id },
        data: { companyId: keep.id, projectId: project.id },
      });
      await db.project.deleteMany({ where: { id: p.id } });
    }
    await db.companyMember.deleteMany({ where: { companyId: c.id } });
    await db.companyRole.deleteMany({ where: { companyId: c.id } });
    await db.company.deleteMany({ where: { id: c.id } });
    known.delete(c.id);
  }
  return { company: keep, project };
}

/** Tasks from the old made-up Personal company move into the real one. */
async function moveOldPersonalTasks(space: PersonalSpace, userId: string) {
  await db.task.updateMany({
    where: {
      companyId: LEGACY_PERSONAL_ID,
      OR: [{ ownerId: userId }, { createdById: userId }],
    },
    data: {
      companyId: space.company.id,
      projectId: space.project.id,
      placedBy: 'personal',
    },
  });
}

/**
 * Its owner is its only member and the project's lead, whatever was
 * changed by hand; anything left under the old Personal moves in.
 */
async function keepPrivate(space: PersonalSpace, userId: string) {
  await moveOldPersonalTasks(space, userId);
  const members: { id: string; userId: string }[] =
    await db.companyMember.findMany({
      where: { companyId: space.company.id },
      select: { id: true, userId: true },
    });
  const others = members.filter((m) => m.userId !== userId);
  if (others.length)
    await db.companyMember.deleteMany({
      where: { id: { in: others.map((m) => m.id) } },
    });
}

/** What a PERSONAL is for, shown as its description and in its hints. */
export const PERSONAL_DESCRIPTION =
  'Your own space, for you alone: gym, exercise, reading, learning and any other self-help goals, plans and tasks. Nobody else can see it.';

export const PERSONAL_COLOR = '#0d9488';

/** Why something can't be done in a PERSONAL. */
export const PERSONAL_ONLY_YOU =
  'Personal is yours alone: nobody else can be added to it.';

/**
 * When a person is deleted, their PERSONAL goes with everything in it: its
 * tasks (through `deleteTask`, which takes their points too), plans,
 * pages, goal schedules and tallies, results and the company itself.
 */
export async function deletePersonalSpace(
  userId: string,
  deleteTask: (task: Task) => Promise<unknown>,
) {
  const companies: Company[] = await db.company.findMany({
    where: { isPersonal: true, ownerId: userId },
  });
  for (const company of companies) {
    const where = { companyId: company.id };
    const tasks: Task[] = await db.task.findMany({ where, take: 20000 });
    for (const task of tasks) await deleteTask(task);
    await db.plan.deleteMany({ where });
    await db.projectPage.deleteMany({ where });
    await db.taskSchedule.deleteMany({ where });
    await db.goalTally.deleteMany({ where });
    await db.projectResult.deleteMany({ where });
    await db.project.deleteMany({ where });
    await db.companyMember.deleteMany({ where });
    await db.companyRole.deleteMany({ where });
    await db.company.deleteMany({ where: { id: company.id } });
    known.delete(company.id);
  }
}

/** Why a project can't move in or out of a PERSONAL. */
export const PERSONAL_STAYS =
  "Projects don't move in or out of Personal: its work is yours alone, and a company's stays the company's.";
