import { db } from '@/lib/mongodb/db-client';
import type { WorklogLink } from '@/models/worklogs';
import type { Project } from '@/models/workspace';

/**
 * The project and every project under it, in its company. They move
 * together, so a sub-project never ends up under a parent in another company.
 */
async function projectTree(project: Project) {
  const all: { id: string; parentId?: string | null }[] =
    await db.project.findMany({
      where: { companyId: project.companyId },
      select: { parentId: true },
    });
  const ids = new Set([project.id]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const p of all)
      if (p.parentId && ids.has(p.parentId) && !ids.has(p.id)) {
        ids.add(p.id);
        grew = true;
      }
  }
  return Array.from(ids);
}

/**
 * Moves a project, with its sub-projects, to another company. Its goals,
 * tasks, schedules, results, points and worklog links go with it; it leaves
 * its old parent. Steps of plans in the old company that named it keep their
 * tasks but lose the project, since a plan's projects are its company's.
 */
export async function moveProject(project: Project, companyId: string) {
  const ids = await projectTree(project);
  const now = new Date().toISOString();
  const where = { projectId: { in: ids } };
  await db.project.updateMany({
    where: { id: { in: ids } },
    data: { companyId, updatedAt: now },
  });
  await db.project.update({
    where: { id: project.id },
    data: { parentId: null },
  });
  await Promise.all([
    db.task.updateMany({ where, data: { companyId, updatedAt: now } }),
    // A schedule leaves its plan, which stays in the old company.
    db.taskSchedule.updateMany({
      where,
      data: { companyId, planId: null, updatedAt: now },
    }),
    db.projectResult.updateMany({ where, data: { companyId } }),
    db.pointEntry.updateMany({ where, data: { companyId } }),
  ]);

  // Worklog lines linked to the project now count for the new company.
  const logs: { id: string; links?: WorklogLink[] }[] =
    await db.workLogs.findMany({
      where: { 'links.projectId': { in: ids } },
      select: { links: true },
    });
  for (const log of logs)
    await db.workLogs.update({
      where: { id: log.id },
      data: {
        links: (log.links ?? []).map((l) =>
          l.projectId && ids.includes(l.projectId) ? { ...l, companyId } : l,
        ),
      },
    });

  const plans: { id: string; steps?: { projectId?: string | null }[] }[] =
    await db.plan.findMany({
      where: { companyId: project.companyId, 'steps.projectId': { in: ids } },
      select: { steps: true },
    });
  for (const plan of plans)
    await db.plan.update({
      where: { id: plan.id },
      data: {
        steps: (plan.steps ?? []).map((s) =>
          s.projectId && ids.includes(s.projectId)
            ? { ...s, projectId: null }
            : s,
        ),
      },
    });

  return { moved: ids.length };
}
