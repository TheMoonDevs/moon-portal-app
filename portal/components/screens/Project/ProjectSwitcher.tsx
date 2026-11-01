'use client';

import * as Popover from '@radix-ui/react-popover';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { Icon, Spin } from '../Admin/shared/AdminUI';
import { PickerList, type PickerOption } from '../Worklogs/DayLog/Picker';

type LiteProject = {
  id: string;
  companyId: string;
  name: string;
  color?: string | null;
  parentId?: string | null;
  isCore?: boolean | null;
};

/** Fetched once per visit: every project in every company the person sees. */
let cached: Promise<LiteProject[]> | null = null;
const loadProjects = () => {
  cached ??= PortalSdk.getData('/api/projects?lite=true', null)
    .then((res) => (res?.data?.projects ?? []) as LiteProject[])
    .catch(() => {
      cached = null;
      return [];
    });
  return cached;
};

/**
 * The project's name in the header, which opens a search across every
 * project in every company the person can see, to jump straight to one.
 */
export const ProjectSwitcher = ({
  projectId,
  name,
}: {
  projectId: string;
  name: string;
}) => {
  const router = useRouter();
  const { companies } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<LiteProject[] | null>(null);

  useEffect(() => {
    if (!open || projects) return;
    loadProjects().then(setProjects);
  }, [open, projects]);

  const options = useMemo<PickerOption[]>(() => {
    if (!projects) return [];
    const companyName = new Map(
      companies.map((c) => [c.company.id, c.company.name]),
    );
    const byId = new Map(projects.map((p) => [p.id, p]));
    const order = new Map(companies.map((c, i) => [c.company.id, i]));
    return [...projects]
      .sort(
        (a, b) =>
          (order.get(a.companyId) ?? 99) - (order.get(b.companyId) ?? 99) ||
          Number(!!b.isCore) - Number(!!a.isCore) ||
          a.name.localeCompare(b.name),
      )
      .map((p) => {
        const parent = p.parentId ? byId.get(p.parentId) : null;
        return {
          id: p.id,
          label: p.id === projectId ? `${p.name} (here)` : p.name,
          hint: parent ? `in ${parent.name}` : undefined,
          group: companyName.get(p.companyId) ?? 'Other',
          color: p.color,
        };
      });
  }, [projects, companies, projectId]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          title="Switch project"
          className={cn(
            'flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 font-medium text-neutral-200 transition-colors hover:bg-white/[0.06] hover:text-white',
            open && 'bg-white/[0.06] text-white',
          )}
        >
          <span className="truncate">{name}</span>
          <Icon
            name="unfold_more"
            className="shrink-0 text-[16px] text-neutral-500"
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="auto-theme z-[1300] w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-xl border border-white/10 bg-neutral-900 text-neutral-100 shadow-2xl shadow-black/50"
        >
          {projects ? (
            <PickerList
              options={options}
              placeholder="Find a project in any company…"
              empty="No project by that name"
              onPick={(o) => {
                setOpen(false);
                if (o.id !== projectId)
                  router.push(`${APP_ROUTES.projects}/${o.id}`);
              }}
            />
          ) : (
            <p className="flex items-center justify-center gap-2 py-8 text-xs text-neutral-500">
              <Spin className="size-3" /> Loading projects
            </p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
