import { db } from '@/lib/mongodb/db-client';
import type { Project } from '@/models/workspace';
import { PROJECT_EFFORT, PROJECT_STATUS } from '@/models/workspace';

export const CORE_PROJECT_NAME = 'CORE';

/**
 * Every company has a CORE project, made with the company. It is an ordinary
 * project marked `isCore`, so renaming it keeps it the company's CORE.
 * Returns the company's CORE project, creating it when it has none.
 */
export async function ensureCoreProject(
  companyId: string,
  createdById: string,
): Promise<Project> {
  const existing: Project | null = await db.project.findFirst({
    where: { companyId, isCore: true },
  });
  if (existing) return existing;

  const now = new Date().toISOString();
  return db.project.create({
    data: {
      companyId,
      name: CORE_PROJECT_NAME,
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
