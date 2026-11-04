'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import type { ProjectRow } from '../Admin/Workspace/AdminProjects';
import { CompanyMark } from '../Admin/Workspace/shared';
import { CompanyTabs, useMyPoints } from './CompanyTabs';

/**
 * Projects in tabs per company, like the leaderboard. The projects the user
 * works on most come first, then their other projects; each row opens the
 * project page.
 */
export const ProjectsSection = () => {
  const { user } = useUser();
  // In the user's order: the companies they work in most first.
  const { companies } = useWorkspace();
  const projectPoints = useMyPoints()?.projects;
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  // The tab the user clicked; until then the top company is shown.
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    PortalSdk.getData('/api/projects', null)
      .then((res) => setProjects(res?.data?.projects ?? []))
      .catch(() => setProjects([]));
  }, []);

  const isMine = (p: ProjectRow) =>
    !!user && (p.leadIds?.includes(user.id) || p.memberIds?.includes(user.id));

  // Companies that have projects, in the user's order.
  const tabs = useMemo(
    () =>
      projects
        ? companies.filter(({ company }) =>
            projects.some((p) => p.companyId === company.id),
          )
        : [],
    [companies, projects],
  );

  const companyId =
    (picked && tabs.some((t) => t.company.id === picked)
      ? picked
      : tabs[0]?.company.id) ?? null;

  const rows = useMemo(
    () =>
      (projects ?? [])
        .filter((p) => p.companyId === companyId)
        .sort(
          (a, b) =>
            (projectPoints?.[b.id] ?? 0) - (projectPoints?.[a.id] ?? 0) ||
            Number(isMine(b)) - Number(isMine(a)),
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projects, companyId, user?.id, projectPoints],
  );

  if (projects && !projects.length) return null;

  return (
    <div className="mt-6">
      <h4 className="px-4 text-lg font-bold">Projects</h4>

      {tabs.length > 0 && (
        <CompanyTabs
          companies={tabs}
          selectedId={companyId}
          onSelect={setPicked}
        />
      )}

      <div
        className={cn(
          'm-4 overflow-hidden bg-white shadow-md',
          tabs.length ? 'mt-0 rounded-b-xl' : 'mt-3 rounded-xl',
        )}
      >
        {!projects ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-neutral-50"
              />
            ))}
          </div>
        ) : (
          <ul className="quiet-scrollbar max-h-[60vh] divide-y divide-neutral-100 overflow-y-auto">
            {rows.map((project) => {
              const goal = project.goals?.[0];
              const progress = goal
                ? project.goalProgress?.find((g) => g.goalId === goal.id)
                : null;
              const open = project.progress
                ? project.progress.total - project.progress.done
                : 0;
              return (
                <li key={project.id}>
                  <Link
                    href={`${APP_ROUTES.projects}/${project.id}`}
                    className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-neutral-50"
                  >
                    <CompanyMark
                      name={project.name}
                      color={project.color}
                      logo={project.logo}
                      size={32}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-neutral-900">
                          {project.name}
                        </span>
                        {isMine(project) && (
                          <span className="shrink-0 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-700">
                            You
                          </span>
                        )}
                      </span>
                      {goal && progress ? (
                        <span className="mt-1 flex items-center gap-2">
                          <span className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-100">
                            <span
                              className="block h-full rounded-full"
                              style={{
                                width: `${progress.percent}%`,
                                backgroundColor: project.color || '#22c55e',
                              }}
                            />
                          </span>
                          <span className="shrink-0 text-[11px] text-neutral-500">
                            {progress.done}/{goal.target} {goal.title}
                          </span>
                        </span>
                      ) : (
                        <span className="block text-xs text-neutral-500">
                          {open} open {open === 1 ? 'task' : 'tasks'}
                        </span>
                      )}
                    </span>
                    <span className="material-symbols-outlined -mr-1 !text-lg text-neutral-300 transition-colors group-hover:text-neutral-600">
                      chevron_right
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
