import { db } from '@/lib/mongodb/db-client';
import type { Project } from '@/models/workspace';
import { PROJECT_EFFORT, PROJECT_STATUS } from '@/models/workspace';

/** What core projects were called before they took their company's name. */
export const CORE_PROJECT_NAME = 'CORE';

/**
 * Every company has a core project, made with the company and named after
 * it, so the company's general work shows under the company's own name. It
 * is an ordinary project marked `isCore`, so renaming it keeps it the
 * company's core. Returns the company's core project, creating it when it
 * has none.
 */
export async function ensureCoreProject(
  companyId: string,
  createdById: string,
): Promise<Project> {
  const existing: Project | null = await db.project.findFirst({
    where: { companyId, isCore: true },
  });
  if (existing) return existing;

  const company = await db.company.findFirst({ where: { id: companyId } });
  const name = company?.name?.trim() || CORE_PROJECT_NAME;

  const now = new Date().toISOString();
  return db.project.create({
    data: {
      companyId,
      name,
      slug: 'core',
      description: null,
      status: PROJECT_STATUS.ACTIVE,
      color: null,
      icon: null,
      logo: null,
      leadIds: [],
      memberIds: [],
      goals: [],
      effort: PROJECT_EFFORT.MEDIUM,
      parentId: null,
      isCore: true,
      createdById,
      createdAt: now,
      updatedAt: now,
    },
  });
}

/**
 * Keeps the core project named after its company when the company is
 * renamed. A core project someone gave a name of its own keeps it.
 */
export async function renameCoreWithCompany(
  companyId: string,
  oldName: string | null | undefined,
  newName: string,
): Promise<void> {
  const core: Project | null = await db.project.findFirst({
    where: { companyId, isCore: true },
  });
  if (!core || core.isPersonal) return;
  const current = core.name.trim().toLowerCase();
  const followsCompany =
    current === CORE_PROJECT_NAME.toLowerCase() ||
    current === (oldName ?? '').trim().toLowerCase();
  if (!followsCompany || core.name === newName) return;
  await db.project.update({
    where: { id: core.id },
    data: { name: newName, updatedAt: new Date().toISOString() },
  });
}
