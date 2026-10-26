'use client';

import { useEffect, useMemo, useState } from 'react';

import { formatMetric, metricLabel } from '@/lib/workspace/projects';
import { useUser } from '@/utils/hooks/useUser';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import type { ProjectRow } from '../Admin/Workspace/AdminProjects';
import { CompanyMark } from '../Admin/Workspace/shared';

/** The projects the user leads or works on, with their goals this period. */
export const ProjectsSection = () => {
  const { user } = useUser();
  const { companies } = useWorkspace();
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);

  useEffect(() => {
    PortalSdk.getData('/api/projects', null)
      .then((res) => setProjects(res?.data?.projects ?? []))
      .catch(() => setProjects([]));
  }, []);

  const mine = useMemo(() => {
    if (!projects || !user) return [];
    const own = projects.filter(
      (p) => p.leadIds?.includes(user.id) || p.memberIds?.includes(user.id),
    );
    return own.length ? own : projects;
  }, [projects, user]);

  const companyName = (id: string) =>
    companies.find((c) => c.company.id === id)?.company.name;

  if (projects && !projects.length) return null;

  return (
    <div className="mt-6">
      <h4 className="px-4 text-lg font-bold">Your projects</h4>
      <div className="m-4 mt-3 flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-xl bg-white shadow-md">
        {!projects ? (
          <div className="h-16 animate-pulse bg-neutral-50" />
        ) : (
          mine.map((project) => {
            const goals = project.goals ?? [];
            const top = project.standings?.[0];
            return (
              <div key={project.id} className="flex flex-col gap-2 p-3">
                <div className="flex items-center gap-3">
                  <CompanyMark
                    name={project.name}
                    color={project.color}
                    logo={project.logo}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-900">
                      {project.name}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {companyName(project.companyId)}
                      {top &&
                        ` · #${top.rank} ${metricLabel(top.metric).toLowerCase()} (${formatMetric(top.metric, top.value)})`}
                    </p>
                  </div>
                </div>
                {goals.map((goal) => {
                  const p = project.goalProgress?.find(
                    (g) => g.goalId === goal.id,
                  );
                  const percent = p?.percent ?? 0;
                  return (
                    <div key={goal.id} className="pl-12">
                      <div className="mb-0.5 flex justify-between text-[11px] text-neutral-500">
                        <span className="truncate">{goal.title}</span>
                        <span
                          className={
                            percent >= 100
                              ? 'font-semibold text-green-600'
                              : 'font-semibold text-neutral-700'
                          }
                        >
                          {p?.done ?? 0}/{goal.target}
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: project.color || '#22c55e',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
