/*
 * How far along a project is, in one number, and where that number comes
 * from. Pure: safe on client and server.
 *
 * A project's own progress is the average of its goals in their current
 * period, or the share of its tasks done when it has no goals. A project
 * with sub-projects also counts theirs: its overall progress averages its
 * own (when it has any) with each sub-project's overall progress.
 */

type GoalLike = { id: string; title: string; target: number; period: string };

export type ProgressProject = {
  id: string;
  name: string;
  color?: string | null;
  parentId?: string | null;
  goals?: GoalLike[] | null;
  goalProgress?: { goalId: string; done: number; percent: number }[] | null;
  progress?: { total: number; done: number; percent: number } | null;
};

export type OwnProgress =
  | { source: 'goals'; percent: number; goals: number }
  | { source: 'tasks'; percent: number; total: number; done: number }
  | { source: 'none'; percent: 0 };

export function ownProgress(p: ProgressProject): OwnProgress {
  const goals = (p.goals ?? [])
    .map((g) => p.goalProgress?.find((x) => x.goalId === g.id))
    .filter((g): g is NonNullable<typeof g> => !!g);
  if (goals.length)
    return {
      source: 'goals',
      percent: Math.round(
        goals.reduce((n, g) => n + g.percent, 0) / goals.length,
      ),
      goals: goals.length,
    };
  if (p.progress?.total)
    return {
      source: 'tasks',
      percent: p.progress.percent,
      total: p.progress.total,
      done: p.progress.done,
    };
  return { source: 'none', percent: 0 };
}

export const childrenOf = <T extends ProgressProject>(
  projects: T[],
  id: string,
) => projects.filter((p) => p.parentId === id);

/** The project's progress with its sub-projects, at any depth. */
export function overallProgress(
  project: ProgressProject,
  projects: ProgressProject[],
  seen: Set<string> = new Set(),
): number {
  if (seen.has(project.id)) return 0;
  seen.add(project.id);
  const own = ownProgress(project);
  const parts = [
    ...(own.source === 'none' ? [] : [own.percent]),
    ...childrenOf(projects, project.id).map((c) =>
      overallProgress(c, projects, seen),
    ),
  ];
  return parts.length
    ? Math.round(parts.reduce((n, x) => n + x, 0) / parts.length)
    : 0;
}

/** Every project under this one, at any depth. */
export function descendantsOf<T extends ProgressProject>(
  projects: T[],
  id: string,
): T[] {
  const out: T[] = [];
  const walk = (at: string) =>
    childrenOf(projects, at).forEach((c) => {
      if (out.includes(c)) return;
      out.push(c);
      walk(c.id);
    });
  walk(id);
  return out;
}

/** Leads of a project and of every project above it. */
export function leadsAbove(
  projects: {
    id: string;
    parentId?: string | null;
    leadIds?: string[] | null;
  }[],
  projectId: string | null,
) {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const leads = new Set<string>();
  let at = projectId ? byId.get(projectId) : undefined;
  for (let i = 0; at && i < 50; i++) {
    (at.leadIds ?? []).forEach((id) => leads.add(id));
    at = at.parentId ? byId.get(at.parentId) : undefined;
  }
  return leads;
}
