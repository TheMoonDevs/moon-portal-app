'use client';

import type { ProjectPage as Page, User } from '@db/client';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast, Toaster } from 'sonner';

import { cn } from '@/lib/utils';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  ConfirmDialog,
  EmptyState,
  Icon,
  Pill,
  Spin,
} from '../Admin/shared/AdminUI';
import {
  AvatarStack,
  CompanyMark,
  errorText,
  PROJECT_STATUS_META,
} from '../Admin/Workspace/shared';
import { PageDoc, SaveBadge, type SaveState } from './PageDoc';
import { GoalsSection } from './sections/GoalsSection';
import { IdeasGallery } from './sections/IdeasSection';
import { KpiSection } from './sections/KpiSection';
import { MembersSection } from './sections/MembersSection';
import { ScheduleSection } from './sections/ScheduleSection';
import { WorklogsSection } from './sections/WorklogsSection';
import {
  ideaTitle,
  isView,
  type PagesData,
  type ProjectData,
  type ViewKey,
  VIEWS,
} from './types';

/* -------------------------------------------------------------------------- */
/*                                   Sidebar                                  */
/* -------------------------------------------------------------------------- */

const NavItem = ({
  icon,
  label,
  active,
  onClick,
  trailing,
  badge,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  trailing?: React.ReactNode;
  badge?: React.ReactNode;
}) => (
  <div className="relative">
    {active && (
      <motion.span
        layoutId="project-nav-active"
        className="absolute inset-0 rounded-lg bg-white/[0.08]"
        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      />
    )}
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
        active ? 'text-white' : 'text-neutral-400 hover:text-neutral-100',
      )}
    >
      {icon && <Icon name={icon} filled={active} className="text-[19px]" />}
      <span className="flex-1 truncate">{label}</span>
      {badge}
      {trailing}
    </button>
  </div>
);

const Sidebar = ({
  data,
  pages,
  companyName,
  view,
  ideaId,
  ideasOpen,
  canEdit,
  creatingIdea,
  onIdeasOpen,
  onSelect,
  onNewIdea,
}: {
  data: ProjectData;
  pages: PagesData | null;
  companyName?: string;
  view: ViewKey;
  ideaId: string | null;
  ideasOpen: boolean;
  canEdit: boolean;
  creatingIdea: boolean;
  onIdeasOpen: (open: boolean) => void;
  onSelect: (view: ViewKey, ideaId?: string | null) => void;
  onNewIdea: () => void;
}) => {
  const { project, people } = data;
  const status =
    PROJECT_STATUS_META[project.status] ?? PROJECT_STATUS_META.ACTIVE;
  const ideas = pages?.ideas ?? [];

  return (
    <aside className="hidden w-[272px] shrink-0 flex-col border-r border-white/[0.07] bg-neutral-950 md:flex">
      <div className="px-4 pb-3 pt-4">
        <Link
          href={APP_ROUTES.home}
          className="mb-4 inline-flex items-center gap-1 text-xs text-neutral-500 transition-colors hover:text-neutral-200"
        >
          <Icon name="arrow_back" className="text-[15px]" /> Home
        </Link>
        <div className="flex items-center gap-3">
          <CompanyMark
            name={project.name}
            color={project.color}
            logo={project.logo}
            size={40}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-white">
              {project.name}
            </p>
            <p className="truncate text-xs text-neutral-500">{companyName}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Pill tone={status.tone}>{status.label}</Pill>
          {people.length > 0 && <AvatarStack users={people} max={5} />}
        </div>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px] text-neutral-500">
            <span>Tasks done</span>
            <span>{project.progress?.percent ?? 0}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: project.color || '#10b981' }}
              initial={{ width: 0 }}
              animate={{ width: `${project.progress?.percent ?? 0}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      <div className="mx-4 border-t border-white/[0.06]" />

      <nav className="custom-scrollbar flex-1 overflow-y-auto px-2 py-3">
        <LayoutGroup id="project-nav">
          {VIEWS.map((v) =>
            v.key === 'ideas' ? (
              <div key={v.key}>
                <NavItem
                  icon={v.icon}
                  label={v.label}
                  active={view === 'ideas' && !ideaId}
                  onClick={() => {
                    onSelect('ideas', null);
                    onIdeasOpen(true);
                  }}
                  badge={
                    ideas.length > 0 && (
                      <span className="text-[11px] text-neutral-600">
                        {ideas.length}
                      </span>
                    )
                  }
                  trailing={
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={ideasOpen ? 'Collapse ideas' : 'Expand ideas'}
                      onClick={(e) => {
                        e.stopPropagation();
                        onIdeasOpen(!ideasOpen);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.stopPropagation();
                          onIdeasOpen(!ideasOpen);
                        }
                      }}
                      className="-mr-1 flex size-5 items-center justify-center rounded text-neutral-500 hover:bg-white/[0.08] hover:text-white"
                    >
                      <motion.span
                        animate={{ rotate: ideasOpen ? 90 : 0 }}
                        className="flex"
                      >
                        <Icon name="chevron_right" className="text-[16px]" />
                      </motion.span>
                    </span>
                  }
                />
                <AnimatePresence initial={false}>
                  {ideasOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="ml-[19px] flex flex-col border-l border-white/[0.07] py-1 pl-2">
                        {ideas.map((idea) => (
                          <NavItem
                            key={idea.id}
                            icon=""
                            label={ideaTitle(idea)}
                            active={view === 'ideas' && ideaId === idea.id}
                            onClick={() => onSelect('ideas', idea.id)}
                            badge={
                              <span className="order-first -mr-1 text-sm leading-none">
                                {idea.emoji || '💡'}
                              </span>
                            }
                          />
                        ))}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={onNewIdea}
                            disabled={creatingIdea}
                            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-500 transition-colors hover:bg-white/[0.04] hover:text-neutral-200"
                          >
                            {creatingIdea ? (
                              <Spin className="size-3" />
                            ) : (
                              <Icon name="add" className="text-[15px]" />
                            )}
                            New idea
                          </button>
                        )}
                        {!canEdit && !ideas.length && (
                          <p className="px-2.5 py-1.5 text-xs text-neutral-600">
                            No ideas yet
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <NavItem
                key={v.key}
                icon={v.icon}
                label={v.label}
                active={view === v.key}
                onClick={() => onSelect(v.key)}
                badge={
                  v.key === 'kpi' && (
                    <span className="rounded-full bg-violet-500/15 px-1.5 py-px text-[10px] font-medium text-violet-300">
                      Soon
                    </span>
                  )
                }
              />
            ),
          )}
        </LayoutGroup>
      </nav>
    </aside>
  );
};

/** On phones the sections scroll sideways under the header. */
const MobileNav = ({
  view,
  onSelect,
}: {
  view: ViewKey;
  onSelect: (view: ViewKey) => void;
}) => (
  <div className="flex gap-1.5 overflow-x-auto border-b border-white/[0.07] px-3 py-2 md:hidden">
    {VIEWS.map((v) => (
      <button
        key={v.key}
        type="button"
        ref={(el) => {
          if (view === v.key)
            el?.scrollIntoView({ inline: 'center', block: 'nearest' });
        }}
        onClick={() => onSelect(v.key)}
        className={cn(
          'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
          view === v.key
            ? 'bg-white text-neutral-950'
            : 'bg-white/[0.05] text-neutral-400',
        )}
      >
        <Icon name={v.icon} className="text-[15px]" />
        {v.label}
      </button>
    ))}
  </div>
);

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */

export const ProjectPage = ({ projectId }: { projectId: string }) => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { companies, can, canInProject } = useWorkspace();

  const [data, setData] = useState<ProjectData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<PagesData | null>(null);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [ideasOpen, setIdeasOpen] = useState(true);
  const [creatingIdea, setCreatingIdea] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [deleting, setDeleting] = useState<Page | null>(null);
  const [busy, setBusy] = useState(false);

  const view: ViewKey = isView(params?.get('view'))
    ? (params?.get('view') as ViewKey)
    : 'objective';
  const ideaId = view === 'ideas' ? (params?.get('idea') ?? null) : null;

  const select = useCallback(
    (next: ViewKey, idea?: string | null) => {
      const q = new URLSearchParams({ view: next });
      if (idea) q.set('idea', idea);
      setSaveState('idle');
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [router, pathname],
  );

  const load = useCallback(() => {
    PortalSdk.getData(`/api/projects/${projectId}`, null)
      .then((res) => setData(res?.data ?? null))
      .catch((err) => setError(errorText(err, 'Could not open the project.')));
  }, [projectId]);

  useEffect(load, [load]);

  useEffect(() => {
    PortalSdk.getData(`/api/projects/${projectId}/pages`, null)
      .then((res) => setPages(res?.data ?? { objective: null, ideas: [] }))
      .catch(() => setPages({ objective: null, ideas: [] }));
  }, [projectId]);

  const companyId = data?.project.companyId;
  useEffect(() => {
    if (!companyId) return;
    PortalSdk.getData(`/api/companies/${companyId}/members`, null)
      .then((res) =>
        setCompanyUsers(
          (res?.data?.members ?? [])
            .map((m: { user: User | null }) => m.user)
            .filter(Boolean),
        ),
      )
      .catch(() => setCompanyUsers([]));
  }, [companyId]);

  const companyName = useMemo(
    () => companies.find((c) => c.company.id === companyId)?.company.name,
    [companies, companyId],
  );

  const savePage = useCallback((page: Page) => {
    setPages((p) => {
      if (!p) return p;
      if (page.kind === 'OBJECTIVE') return { ...p, objective: page };
      const exists = p.ideas.some((i) => i.id === page.id);
      return {
        ...p,
        ideas: exists
          ? p.ideas.map((i) => (i.id === page.id ? { ...i, ...page } : i))
          : [page, ...p.ideas],
      };
    });
  }, []);

  const newIdea = async () => {
    setCreatingIdea(true);
    try {
      const res = await PortalSdk.postData(`/api/projects/${projectId}/pages`, {
        kind: 'IDEA',
        title: '',
        emoji: '💡',
      });
      const page: Page = res?.data?.page;
      savePage(page);
      setIdeasOpen(true);
      select('ideas', page.id);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setCreatingIdea(false);
    }
  };

  const deleteIdea = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await PortalSdk.deleteData(
        `/api/projects/${projectId}/pages/${deleting.id}`,
        {},
      );
      setPages(
        (p) =>
          p && { ...p, ideas: p.ideas.filter((i) => i.id !== deleting.id) },
      );
      setDeleting(null);
      select('ideas', null);
      toast.success('Idea deleted');
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (error)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-neutral-950 md:left-16">
        <EmptyState
          icon="folder_off"
          title="Project not found"
          description={error}
          action={
            <Link href={APP_ROUTES.home} className="text-sm text-sky-300">
              Back home
            </Link>
          }
        />
      </div>
    );

  if (!data)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-neutral-950 md:left-16">
        <Spin className="size-5" />
      </div>
    );

  const { project, tasks, people } = data;
  const canEdit = can(project.companyId, 'projects:edit');
  const idea = pages?.ideas.find((i) => i.id === ideaId) ?? null;
  const isDoc = view === 'objective' || (view === 'ideas' && !!idea);
  const current = VIEWS.find((v) => v.key === view)!;

  const content = (() => {
    switch (view) {
      case 'objective':
        return pages ? (
          <PageDoc
            key="objective"
            projectId={project.id}
            page={pages.objective}
            kind="OBJECTIVE"
            canEdit={canEdit}
            defaultEmoji="🎯"
            titlePlaceholder="Objective"
            bodyPlaceholder="Why does this project exist, and what does done look like? Press / for blocks…"
            onSaved={savePage}
            onSaveState={setSaveState}
          />
        ) : null;
      case 'kpi':
        return <KpiSection />;
      case 'ideas':
        return idea ? (
          <PageDoc
            key={idea.id}
            projectId={project.id}
            page={idea}
            kind="IDEA"
            canEdit={canEdit}
            defaultEmoji="💡"
            titlePlaceholder="Untitled idea"
            bodyPlaceholder="Dump the idea here. Press / for headings, lists and to-dos…"
            onSaved={savePage}
            onSaveState={setSaveState}
          />
        ) : (
          <IdeasGallery
            ideas={pages?.ideas ?? []}
            canEdit={canEdit}
            creating={creatingIdea}
            onOpen={(id) => select('ideas', id)}
            onCreate={newIdea}
          />
        );
      case 'goals':
        return (
          <GoalsSection
            project={project}
            tasks={tasks}
            canEdit={canEdit}
            onSaved={load}
          />
        );
      case 'schedule':
        return (
          <ScheduleSection
            project={project}
            tasks={tasks}
            people={people}
            companyUsers={companyUsers}
            canCreate={canInProject(project, 'tasks:create')}
            canEdit={canInProject(project, 'tasks:edit')}
            canDelete={canInProject(project, 'tasks:delete')}
            onTasksChange={load}
          />
        );
      case 'members':
        return (
          <MembersSection
            project={project}
            tasks={tasks}
            people={people}
            companyUsers={companyUsers}
            canEdit={canEdit}
            onSaved={load}
          />
        );
      case 'worklogs':
        return <WorklogsSection projectId={project.id} tasks={tasks} />;
    }
  })();

  return (
    <div className="fixed inset-0 flex bg-neutral-950 pb-[72px] text-neutral-100 md:left-16 md:pb-0">
      <Sidebar
        data={data}
        pages={pages}
        companyName={companyName}
        view={view}
        ideaId={ideaId}
        ideasOpen={ideasOpen}
        canEdit={canEdit}
        creatingIdea={creatingIdea}
        onIdeasOpen={setIdeasOpen}
        onSelect={select}
        onNewIdea={newIdea}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.07] px-4 text-sm">
          <Link
            href={APP_ROUTES.home}
            className="text-neutral-500 hover:text-white md:hidden"
            aria-label="Home"
          >
            <Icon name="arrow_back" className="text-[18px]" />
          </Link>
          <span className="hidden min-w-0 items-center gap-2 md:flex">
            <span className="truncate text-neutral-500">{companyName}</span>
            <Icon
              name="chevron_right"
              className="text-[16px] text-neutral-700"
            />
          </span>
          <span className="truncate font-medium text-neutral-200">
            {project.name}
          </span>
          <Icon name="chevron_right" className="text-[16px] text-neutral-700" />
          <button
            type="button"
            onClick={() => select(view)}
            className="truncate text-neutral-400 hover:text-white"
          >
            {current.label}
          </button>
          {idea && (
            <>
              <Icon
                name="chevron_right"
                className="text-[16px] text-neutral-700"
              />
              <span className="truncate text-neutral-400">
                {ideaTitle(idea)}
              </span>
            </>
          )}
          <div className="flex-1" />
          {isDoc && canEdit && <SaveBadge state={saveState} />}
          {idea && canEdit && (
            <button
              type="button"
              onClick={() => setDeleting(idea)}
              aria-label="Delete idea"
              title="Delete idea"
              className="flex size-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-white/[0.06] hover:text-rose-300"
            >
              <Icon name="delete" className="text-[18px]" />
            </button>
          )}
        </header>
        <MobileNav view={view} onSelect={(v) => select(v)} />

        <main className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${view}:${ideaId ?? ''}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              {content}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting ? ideaTitle(deleting) : 'this idea'}?`}
        message="The draft goes away for everyone on the project."
        confirmLabel="Delete idea"
        loading={busy}
        onConfirm={deleteIdea}
      />
      <Toaster theme="dark" position="bottom-right" richColors />
    </div>
  );
};
