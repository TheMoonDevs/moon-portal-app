'use client';

import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import {
  isCoreProject,
  projectLabelInCompany,
} from '@/lib/workspace/projectLabel';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { AdminButton, EmptyState } from '../Admin/shared/AdminUI';
import { CompanyBar } from './CompanyBar';
import { NewProjectDialog } from './NewProjectDialog';
import { type Overview, type Pulse, PULSES } from './overview';
import { ProjectRequests, type RequestsData } from './ProjectRequests';
import { NavMenuButton, useProjectsShell } from './ProjectsShell';
import { Tip, TipProvider } from './Tip';

// Kept between visits, so coming back from a project shows the page at once.
let cached: Overview | null = null;
let cachedRequests: RequestsData | null = null;

/** Core projects read "ZONE (Core)", beside the company's other projects. */
const withCoreLabels = (data: Overview | null): Overview | null => {
  if (!data) return data;
  const companies = new Map(data.companies.map((c) => [c.id, c]));
  return {
    ...data,
    projects: data.projects.map((p) => {
      if (!isCoreProject(p)) return p;
      const company = companies.get(p.companyId);
      return {
        ...p,
        name: projectLabelInCompany(p, company?.name),
        logo: p.logo || company?.logo || null,
      };
    }),
  };
};

const BarSkeleton = () => (
  <div className="flex h-[220px] overflow-hidden rounded-2xl border border-white/[0.04] bg-white/[0.02]">
    <div className="w-60 border-r border-white/[0.04] p-5">
      <div className="size-[72px] animate-pulse rounded-2xl bg-white/[0.06]" />
      <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-white/[0.06]" />
    </div>
    <div className="flex-1 space-y-3 p-5">
      <div className="h-10 animate-pulse rounded-xl bg-white/[0.04]" />
      <div className="h-16 animate-pulse rounded-xl bg-white/[0.03]" />
    </div>
  </div>
);

/**
 * Projects Home: one bar per company with how its month is going, and Core
 * and Edit buttons. The projects themselves are in the sidebar on the left.
 * New projects are made here, or asked for when the person may not make
 * them.
 */
export const ProjectsOverview = () => {
  const { can } = useWorkspace();
  const { refreshNav } = useProjectsShell();
  const [data, setData] = useState<Overview | null>(cached);
  const [requests, setRequests] = useState<RequestsData | null>(cachedRequests);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);

  const load = useCallback(() => {
    PortalSdk.getData('/api/projects/overview', null)
      .then((res) => {
        cached = withCoreLabels(res?.data ?? null);
        setData(cached);
      })
      .catch(() => setFailed(!cached));
    PortalSdk.getData('/api/projects/requests', null)
      .then((res) => {
        cachedRequests = res?.data ?? null;
        setRequests(cachedRequests);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    load();
    // Opened from a request's notification.
    setHighlight(new URLSearchParams(window.location.search).get('request'));
  }, [load]);

  const all = useMemo(() => data?.projects ?? [], [data]);
  const people = useMemo(
    () => new Map((data?.users ?? []).map((u) => [u.id, u])),
    [data],
  );
  // Companies with at least one project, in the order the API gave them.
  const companies = useMemo(
    () =>
      (data?.companies ?? []).filter((c) =>
        data?.projects.some((p) => p.companyId === c.id),
      ),
    [data],
  );

  return (
    <TipProvider delayDuration={120}>
      <div className="custom-scrollbar absolute inset-0 overflow-y-auto pb-[88px] md:pb-12">
        <div className="mx-auto max-w-6xl px-4 pt-6 md:px-8 md:pt-10">
          <div className="flex items-center gap-2">
            <NavMenuButton />
            <h1 className="flex-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
              Home
            </h1>
            {data && data.companies.length > 0 && (
              <AdminButton
                tone="primary"
                size="sm"
                icon="add"
                onClick={() => setCreating(true)}
              >
                New project
              </AdminButton>
            )}
          </div>
          {/* What the dots mean */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-neutral-500">
            {(Object.keys(PULSES) as Pulse[]).map((key) => (
              <Tip key={key} content={PULSES[key].hint}>
                <span className="flex cursor-help items-center gap-1.5">
                  <span
                    className={cn('size-1.5 rounded-full', PULSES[key].dot)}
                  />
                  {PULSES[key].label}
                </span>
              </Tip>
            ))}
          </div>

          {requests && (
            <ProjectRequests
              data={requests}
              highlight={highlight}
              companyName={(id) =>
                data?.companies.find((c) => c.id === id)?.name ?? ''
              }
              projectName={(id) => all.find((p) => p.id === id)?.name}
              onChanged={(created) => {
                load();
                refreshNav();
                if (created) setHighlight(null);
              }}
            />
          )}

          {!data && !failed ? (
            <div className="mt-6 flex flex-col gap-4">
              {[0, 1, 2].map((i) => (
                <BarSkeleton key={i} />
              ))}
            </div>
          ) : failed ? (
            <EmptyState
              icon="cloud_off"
              title="Couldn't load your companies"
              description="Refresh the page to try again."
            />
          ) : !companies.length ? (
            <EmptyState
              icon="folder_open"
              title="No projects yet"
              description="Start one with New project."
            />
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              {companies.map((company, i) => (
                <motion.section
                  key={company.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                >
                  <CompanyBar
                    company={company}
                    all={all}
                    people={people}
                    editHref={
                      !company.isPersonal && can(company.id, 'companies:edit')
                        ? `${APP_ROUTES.admin}?tab=companies&companyId=${company.id}`
                        : null
                    }
                  />
                </motion.section>
              ))}
            </div>
          )}
        </div>

        <NewProjectDialog
          open={creating}
          onOpenChange={setCreating}
          projects={all}
          companyId={null}
          parentId={null}
          onDone={() => {
            load();
            refreshNav();
          }}
        />
      </div>
    </TipProvider>
  );
};
