import { db } from '@/lib/mongodb/db-client';
import type { Project, ProjectGoal } from '@/models/workspace';

import { syncGoalSchedules } from './goalSchedules';
import { sanitizeGoals } from './projects';

/**
 * Saves a project's goals and brings the tasks they make in step. Goals
 * from before the day they were set was kept count from the project's
 * start. Returns the project after.
 */
export async function saveGoals(
  project: Project,
  goals: unknown[],
  userId: string,
): Promise<Project> {
  const created = project.createdAt
    ? new Date(project.createdAt as string).toISOString().slice(0, 10)
    : null;
  const updated: Project = await db.project.update({
    where: { id: project.id },
    data: {
      goals: sanitizeGoals(goals, project.goals ?? [], created),
      updatedAt: new Date().toISOString(),
    },
  });
  await syncGoalSchedules(updated, project.goals ?? [], userId);
  return updated;
}

/** Adds one goal; returns it as saved. */
export async function addGoal(
  project: Project,
  goal: Partial<ProjectGoal>,
  userId: string,
) {
  const { id: _drop, ...fresh } = goal;
  const updated = await saveGoals(
    project,
    [...(project.goals ?? []), fresh],
    userId,
  );
  return { project: updated, goal: updated.goals?.at(-1) ?? null };
}

/** Changes one goal; returns it as saved, or null when it is gone. */
export async function changeGoal(
  project: Project,
  goalId: string,
  patch: Partial<ProjectGoal>,
  userId: string,
) {
  const goals = project.goals ?? [];
  if (!goals.some((g) => g.id === goalId)) return null;
  const updated = await saveGoals(
    project,
    goals.map((g) => (g.id === goalId ? { ...g, ...patch, id: g.id } : g)),
    userId,
  );
  return updated.goals?.find((g) => g.id === goalId) ?? null;
}

/** Removes one goal; its tasks stay and stop counting towards it. */
export async function removeGoal(
  project: Project,
  goalId: string,
  userId: string,
) {
  return saveGoals(
    project,
    (project.goals ?? []).filter((g) => g.id !== goalId),
    userId,
  );
}
