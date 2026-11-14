'use client';

import type { ProjectPage as Page } from '@db/client';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { projectLabelInCompany } from '@/lib/workspace/projectLabel';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { AdminButton, AdminModal, Icon } from '../Admin/shared/AdminUI';
import { CompanyMark, errorText } from '../Admin/Workspace/shared';
import { useProjectsShell } from '../Projects/ProjectsShell';
import { pageTitle } from './types';

/**
 * Moves a page, with every page inside it, to another project the person
 * can edit. It lands at the top of that project's pages.
 */
export const MovePageDialog = ({
  page,
  inside,
  projectId,
  onOpenChange,
  onMoved,
}: {
  /** The page to move; null when closed. */
  page: Page | null;
  /** How many pages are inside it, which move too. */
  inside: number;
  /** The project it is in now. */
  projectId: string;
  onOpenChange: (open: boolean) => void;
  onMoved: (ids: string[], to: { id: string; name: string }) => void;
}) => {
  const { nav } = useProjectsShell();
  const { can } = useWorkspace();
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!page) return;
    setSearch('');
    setPicked(null);
  }, [page]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (nav?.companies ?? [])
      .filter((c) => can(c.id, 'projects:edit'))
      .map((company) => ({
        company,
        projects: (nav?.projects ?? [])
          .filter(
            (p) =>
              p.companyId === company.id &&
              p.id !== projectId &&
              p.status !== 'ARCHIVED',
          )
          .map((p) => ({
            ...p,
            label: projectLabelInCompany(p, company.name),
          }))
          .filter((p) => !q || p.label.toLowerCase().includes(q))
          .sort(
            (a, b) =>
              Number(!!b.isCore) - Number(!!a.isCore) ||
              a.label.localeCompare(b.label),
          ),
      }))
      .filter((g) => g.projects.length);
  }, [nav, can, projectId, search]);

  const target = groups.flatMap((g) => g.projects).find((p) => p.id === picked);

  const move = async () => {
    if (!page || !target) return;
    setSaving(true);
    try {
      const res = await PortalSdk.postData(
        `/api/projects/${projectId}/pages/${page.id}/move`,
        { projectId: target.id },
      );
      onMoved(res?.data?.moved ?? [page.id], {
        id: target.id,
        name: target.label,
      });
    } catch (err) {
      toast.error(errorText(err, 'Could not move the page.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open={!!page}
      onOpenChange={(open) => !saving && onOpenChange(open)}
      title={`Move ${page ? pageTitle(page) : 'page'}`}
      description={
        inside
          ? `The ${inside} ${inside === 1 ? 'page' : 'pages'} inside it move too. It lands at the top of the project's pages.`
          : "It lands at the top of the project's pages."
      }
      icon="drive_file_move"
      size="sm"
      footer={
        <>
          <AdminButton onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </AdminButton>
          <AdminButton
            tone="primary"
            onClick={move}
            loading={saving}
            disabled={!target}
          >
            {target ? `Move to ${target.label}` : 'Move'}
          </AdminButton>
        </>
      }
    >
      <label className="mb-3 flex h-9 items-center gap-2 rounded-lg bg-white/[0.05] px-3 text-neutral-500 focus-within:bg-white/[0.08]">
        <Icon name="search" className="text-[17px]" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Find a project"
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-600"
        />
      </label>
      <div className="custom-scrollbar -mx-1 max-h-80 overflow-y-auto px-1">
        {!groups.length && (
          <p className="py-6 text-center text-sm text-neutral-500">
            {search
              ? 'No project by that name.'
              : 'No other project you can edit.'}
          </p>
        )}
        {groups.map(({ company, projects }) => (
          <div key={company.id} className="pb-2">
            <p className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-neutral-400">
              <CompanyMark
                name={company.name}
                color={company.color}
                logo={company.logo}
                size={16}
              />
              {company.name}
            </p>
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPicked(p.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  picked === p.id
                    ? 'bg-white/[0.1] text-white'
                    : 'text-neutral-300 hover:bg-white/[0.05]',
                )}
              >
                <span
                  className="size-2 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: p.color || '#737373' }}
                />
                <span className="flex-1 truncate">{p.label}</span>
                {picked === p.id && (
                  <Icon name="check" className="text-[17px]" />
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
    </AdminModal>
  );
};
