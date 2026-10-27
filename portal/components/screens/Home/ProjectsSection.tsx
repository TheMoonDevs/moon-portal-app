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

/**
 * Projects in tabs per company, like the leaderboard. The user's own
 * projects come first; each row opens the project page.
 */
export const ProjectsSection = () => {
  const { user } = useUser();
  const { companies } = useWorkspace();
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    PortalSdk.getData('/api/projects', null)
      .then((res) => setProjects(res?.data?.projects ?? []))
      .catch(() => setProjects([]));
  }, []);

  const isMine = (p: ProjectRow) =>
    !!user && (p.leadIds?.includes(user.id) || p.memberIds?.includes(user.id));

  // Companies that have projects, the ones with the user's projects first.
  const tabs = useMemo(() => {
    if (!projects) return [];
    const withProjects = companies.filter(({ company }) =>
      projects.some((p) => p.companyId === company.id),
    );
    const mineIn = (id: string) =>
      projects.some((p) => p.companyId === id && isMine(p)) ? 0 : 1;
    return withProjects.sort(
      (a, b) => mineIn(a.company.id) - mineIn(b.company.id),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, projects, user?.id]);

  useEffect(() => {
    if (companyId && tabs.some((t) => t.company.id === companyId)) return;
    setCompanyId(tabs[0]?.company.id ?? null);
  }, [tabs, companyId]);

  const rows = useMemo(
    () =>
      (projects ?? [])
        .filter((p) => p.companyId === companyId)
        .sort((a, b) => Number(isMine(b)) - Number(isMine(a))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projects, companyId, user?.id],
  );

  if (projects && !projects.length) return null;

  return (
    <div className="mt-6">
      <h4 className="px-4 text-lg font-bold">Projects</h4>

      {tabs.length > 0 && (
        <div className="m-4 mb-0 mt-3 flex gap-1 overflow-x-auto border-b border-neutral-200">
          {tabs.map(({ company }) => (
            <button
              key={company.id}
              onClick={() => setCompanyId(company.id)}
              className={cn(
                '-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 pb-2 pt-1 text-xs font-semibold transition-colors',
                company.id === companyId
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800',
              )}
            >
              <CompanyMark
                name={company.name}
                color={company.color}
                logo={company.logo}
                size={18}
              />
              {company.name}
            </button>
          ))}
        </div>
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
          <ul className="max-h-[60vh] divide-y divide-neutral-100 overflow-y-auto">
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
