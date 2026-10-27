'use client';

import type { User } from '@db/client';
import { useEffect, useState } from 'react';

import { COMPANY_PERMISSION_RESOURCES } from '@/lib/permissions/catalog';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  EmptyState,
  Icon,
  Panel,
  PanelHeader,
  Pill,
  SkeletonRows,
} from '../shared/AdminUI';
import { CompanyMark } from '../Workspace/shared';

type Reach = {
  hiddenCompanies: number;
  companies: {
    id: string;
    name: string;
    color: string | null;
    logo: string | null;
    roles: string[];
    owner: boolean;
    permissions: string[];
    projectCount: number;
    openTasks: number;
    projects: {
      id: string;
      name: string;
      color: string | null;
      lead: boolean;
      openTasks: number;
    }[];
    plans: { id: string; title: string; owner: boolean }[];
  }[];
};

const VERBS: Record<string, string> = {
  read: 'see',
  create: 'add',
  edit: 'edit',
  delete: 'delete',
};

/** "Projects: see, add, edit · Tasks: see" from company permissions. */
const summary = (permissions: string[]) =>
  COMPANY_PERMISSION_RESOURCES.map((resource) => {
    const actions = resource.actions.filter((a) =>
      permissions.includes(`${resource.key}:${a}`),
    );
    return actions.length
      ? `${resource.label}: ${actions.map((a) => VERBS[a] ?? a).join(', ')}`
      : null;
  })
    .filter(Boolean)
    .join(' · ');

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * Where a person has access: their companies and roles, the projects they
 * lead or are on (whose tasks and plans they run), their open tasks and
 * their plans. Read-only; roles and policies are changed above and below.
 */
export const AdminUserReach = ({ user }: { user: User }) => {
  const { canPortal } = useWorkspace();
  const [reach, setReach] = useState<Reach | null>(null);
  const canRead = canPortal('permissions:read');

  useEffect(() => {
    if (!canRead || !user.id) return;
    let cancelled = false;
    setReach(null);
    PortalSdk.getData(`/api/user/access?userId=${user.id}`, null)
      .then((res) => !cancelled && setReach(res?.data ?? null))
      .catch(
        () => !cancelled && setReach({ companies: [], hiddenCompanies: 0 }),
      );
    return () => {
      cancelled = true;
    };
  }, [canRead, user.id]);

  if (!canRead || !user.id) return null;

  return (
    <Panel>
      <PanelHeader
        title="What they can reach"
        description="Members add and edit projects. The people on a project run its tasks and plans. Owners can do everything."
        icon="travel_explore"
      />
      {!reach ? (
        <SkeletonRows rows={3} />
      ) : !reach.companies.length ? (
        <EmptyState
          icon="domain_disabled"
          title="Not in any of your companies"
          description={
            reach.hiddenCompanies
              ? `They are in ${plural(reach.hiddenCompanies, 'company', 'companies')} you are not in.`
              : 'Add them to a company to give them projects and tasks.'
          }
        />
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.07]">
          {reach.companies.map((c) => (
            <div key={c.id} className="flex flex-col gap-3 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <CompanyMark
                  name={c.name}
                  color={c.color}
                  logo={c.logo}
                  size={28}
                />
                <span className="text-sm font-medium text-neutral-100">
                  {c.name}
                </span>
                {c.roles.map((role) => (
                  <Pill
                    key={role}
                    tone={role === 'Owner' ? 'warning' : 'neutral'}
                  >
                    {role}
                  </Pill>
                ))}
                {!c.roles.length && <Pill>Member</Pill>}
              </div>
              <p className="text-xs text-neutral-400">
                {c.owner ? 'Can do everything here.' : summary(c.permissions)}
              </p>

              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                  On {plural(c.projects.length, 'project')} of {c.projectCount}
                  {c.openTasks > 0 && ` · ${plural(c.openTasks, 'open task')}`}
                </p>
                {c.projects.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {c.projects.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-xs text-neutral-200"
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: p.color || '#525252' }}
                        />
                        {p.name}
                        {p.lead && (
                          <span className="text-[10px] uppercase text-amber-300">
                            Lead
                          </span>
                        )}
                        {p.openTasks > 0 && (
                          <span className="text-neutral-500">
                            {p.openTasks}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500">
                    Not on any project team yet.
                  </p>
                )}
              </div>

              {c.plans.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    {plural(c.plans.length, 'plan')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.plans.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-xs text-neutral-200"
                      >
                        <Icon
                          name="map"
                          className="text-[14px] text-neutral-500"
                        />
                        {p.title}
                        {p.owner && (
                          <span className="text-[10px] uppercase text-neutral-500">
                            Owner
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {reach.hiddenCompanies > 0 && (
            <p className="px-5 py-3 text-xs text-neutral-500">
              Also in {plural(reach.hiddenCompanies, 'company', 'companies')}{' '}
              you are not in.
            </p>
          )}
        </div>
      )}
    </Panel>
  );
};
