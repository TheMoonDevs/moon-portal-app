'use client';

import type { ProjectPage as Page, User } from '@db/client';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast, Toaster } from 'sonner';

import { cn } from '@/lib/utils';
import {
  ancestorPages,
  childPages,
  descendantIds,
} from '@/lib/workspace/projectPages';
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
import { NewProjectDialog } from '../Projects/NewProjectDialog';
import { PageDoc, SaveBadge, type SaveState } from './PageDoc';
import { GoalsSection } from './sections/GoalsSection';
import { KpiSection } from './sections/KpiSection';
import { MembersSection } from './sections/MembersSection';
import { PagesGallery, PagesInside } from './sections/PagesSection';
import { ScheduleSection } from './sections/ScheduleSection';
import { WorklogsSection } from './sections/WorklogsSection';
import {
  byCreation,
  isView,
  type PagesData,
  pageTitle,
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

/** A page in the sidebar, with the pages inside it below when open. */
const PageTreeItem = ({
  page,
  pages,
  activeId,
  open,
  canEdit,
  creatingIn,
  onToggle,
  onSelect,
  onNewPage,
}: {
  page: Page;
  pages: Page[];
  activeId: string | null;
  open: Set<string>;
  canEdit: boolean;
  /** The parent a new page is being made in, if any. */
  creatingIn: string | null | undefined;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onNewPage: (parentId: string | null) => void;
}) => {
  const inside = childPages(pages, page.id);
  const isOpen = open.has(page.id);
  return (
    <div>
      <div className="group/page relative">
        <NavItem
          icon=""
          label={pageTitle(page)}
          active={activeId === page.id}
          onClick={() => onSelect(page.id)}
          badge={
            <span className="order-first -mr-1 flex items-center gap-1">
              <span
                role="button"
                tabIndex={0}
                aria-label={isOpen ? 'Collapse page' : 'Expand page'}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(page.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                    onToggle(page.id);
                  }
                }}
                className={cn(
                  'flex size-4 items-center justify-center rounded text-neutral-600 hover:bg-white/[0.08] hover:text-white',
                  !inside.length && 'opacity-0 group-hover/page:opacity-100',
                )}
              >
                <motion.span
                  animate={{ rotate: isOpen ? 90 : 0 }}
                  className="flex"
                >
                  <Icon name="chevron_right" className="text-[14px]" />
                </motion.span>
              </span>
              <span className="text-sm leading-none">{page.emoji || '📄'}</span>
            </span>
          }
          trailing={
            canEdit && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Add a page inside"
                title="Add a page inside"
                onClick={(e) => {
                  e.stopPropagation();
                  onNewPage(page.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                    onNewPage(page.id);
                  }
                }}
                className="-mr-1 flex size-5 items-center justify-center rounded text-neutral-500 opacity-0 hover:bg-white/[0.08] hover:text-white group-hover/page:opacity-100"
              >
                {creatingIn === page.id ? (
                  <Spin className="size-3" />
                ) : (
                  <Icon name="add" className="text-[15px]" />
                )}
              </span>
            )
          }
        />
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="ml-[15px] flex flex-col border-l border-white/[0.07] pl-1.5">
              {inside.map((child) => (
                <PageTreeItem
                  key={child.id}
                  page={child}
                  pages={pages}
                  activeId={activeId}
                  open={open}
                  canEdit={canEdit}
                  creatingIn={creatingIn}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  onNewPage={onNewPage}
                />
              ))}
              {!inside.length && (
                <p className="px-2.5 py-1 text-xs text-neutral-600">
                  No pages inside
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Sidebar = ({
  data,
  pages,
  companyName,
  view,
  pageId,
  pagesOpen,
  openPages,
  canEdit,
  creatingIn,
  onPagesOpen,
  onTogglePage,
  onSelect,
  onNewPage,
  onNewSub,
}: {
  data: ProjectData;
  pages: PagesData | null;
  companyName?: string;
  view: ViewKey;
  pageId: string | null;
  pagesOpen: boolean;
  openPages: Set<string>;
  canEdit: boolean;
  creatingIn: string | null | undefined;
  onPagesOpen: (open: boolean) => void;
  onTogglePage: (id: string) => void;
  onSelect: (view: ViewKey, pageId?: string | null) => void;
  onNewPage: (parentId: string | null) => void;
  onNewSub: () => void;
}) => {
  const { project, people } = data;
  const tree = data.tree ?? [];
  const parent = tree.find((p) => p.id === project.parentId);
  const subs = tree.filter((p) => p.parentId === project.id);
  const status =
    PROJECT_STATUS_META[project.status] ?? PROJECT_STATUS_META.ACTIVE;
  const all = useMemo(
    () => [...(pages?.pages ?? [])].sort(byCreation),
    [pages?.pages],
  );
  const top = childPages(all, null);

  return (
    <aside className="hidden w-[272px] shrink-0 flex-col border-r border-white/[0.07] bg-neutral-950 md:flex">
      <div className="px-4 pb-3 pt-4">
        <Link
          href={APP_ROUTES.projects}
          className="mb-4 inline-flex items-center gap-1 text-xs text-neutral-500 transition-colors hover:text-neutral-200"
        >
          <Icon name="arrow_back" className="text-[15px]" /> Projects
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
            {parent ? (
              <Link
                href={`${APP_ROUTES.projects}/${parent.id}`}
                className="flex items-center gap-0.5 truncate text-xs text-neutral-500 hover:text-neutral-200"
              >
                <Icon name="subdirectory_arrow_right" className="text-[13px]" />
                <span className="truncate">{parent.name}</span>
              </Link>
            ) : (
              <p className="truncate text-xs text-neutral-500">{companyName}</p>
            )}
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
            v.key === 'pages' ? (
              <div key={v.key}>
                <NavItem
                  icon={v.icon}
                  label={v.label}
                  active={view === 'pages' && !pageId}
                  onClick={() => {
                    onSelect('pages', null);
                    onPagesOpen(true);
                  }}
                  badge={
                    all.length > 0 && (
                      <span className="text-[11px] text-neutral-600">
                        {all.length}
                      </span>
                    )
                  }
                  trailing={
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={pagesOpen ? 'Collapse pages' : 'Expand pages'}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPagesOpen(!pagesOpen);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.stopPropagation();
                          onPagesOpen(!pagesOpen);
                        }
                      }}
                      className="-mr-1 flex size-5 items-center justify-center rounded text-neutral-500 hover:bg-white/[0.08] hover:text-white"
                    >
                      <motion.span
                        animate={{ rotate: pagesOpen ? 90 : 0 }}
                        className="flex"
                      >
                        <Icon name="chevron_right" className="text-[16px]" />
                      </motion.span>
                    </span>
                  }
                />
                <AnimatePresence initial={false}>
                  {pagesOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="ml-[19px] flex flex-col border-l border-white/[0.07] py-1 pl-1.5">
                        {top.map((page) => (
                          <PageTreeItem
                            key={page.id}
                            page={page}
                            pages={all}
                            activeId={view === 'pages' ? pageId : null}
                            open={openPages}
                            canEdit={canEdit}
                            creatingIn={creatingIn}
                            onToggle={onTogglePage}
                            onSelect={(id) => onSelect('pages', id)}
                            onNewPage={onNewPage}
                          />
                        ))}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => onNewPage(null)}
                            disabled={creatingIn !== undefined}
                            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-500 transition-colors hover:bg-white/[0.04] hover:text-neutral-200"
                          >
                            {creatingIn === null ? (
                              <Spin className="size-3" />
                            ) : (
                              <Icon name="add" className="text-[15px]" />
                            )}
                            New page
                          </button>
                        )}
                        {!canEdit && !all.length && (
                          <p className="px-2.5 py-1.5 text-xs text-neutral-600">
                            No pages yet
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

        <div className="mt-4 border-t border-white/[0.06] pt-3">
          <p className="flex items-center justify-between px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
            Sub-projects
            <button
              type="button"
              onClick={onNewSub}
              aria-label="New sub-project"
              title="New sub-project"
              className="flex size-5 items-center justify-center rounded text-neutral-500 hover:bg-white/[0.08] hover:text-white"
            >
              <Icon name="add" className="text-[16px]" />
            </button>
          </p>
          {subs.map((sub) => (
            <Link
              key={sub.id}
              href={`${APP_ROUTES.projects}/${sub.id}`}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-neutral-400 transition-colors hover:bg-white/[0.04] hover:text-neutral-100"
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: sub.color || '#737373' }}
              />
              <span className="flex-1 truncate">{sub.name}</span>
              {tree.some((p) => p.parentId === sub.id) && (
                <Icon
                  name="account_tree"
                  className="text-[14px] text-neutral-600"
                />
              )}
            </Link>
          ))}
          {!subs.length && (
            <button
              type="button"
              onClick={onNewSub}
              className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-600 hover:bg-white/[0.04] hover:text-neutral-300"
            >
              Split this project into smaller ones
            </button>
          )}
        </div>
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
  const [addingSub, setAddingSub] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<PagesData | null>(null);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [pagesOpen, setPagesOpen] = useState(true);
  const [openPages, setOpenPages] = useState<Set<string>>(new Set());
  /** The parent a new page is being made in: null at the top level. */
  const [creatingIn, setCreatingIn] = useState<string | null | undefined>();
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [deleting, setDeleting] = useState<Page | null>(null);
  const [busy, setBusy] = useState(false);

  // Links from when pages were called ideas still open them.
  const asked = params?.get('view');
  const view: ViewKey =
    asked === 'ideas'
      ? 'pages'
      : isView(asked)
        ? (asked as ViewKey)
        : VIEWS[0].key;
  const pageId =
    view === 'pages'
      ? (params?.get('page') ?? params?.get('idea') ?? null)
      : null;

  const select = useCallback(
    (next: ViewKey, page?: string | null) => {
      const q = new URLSearchParams({ view: next });
      if (page) q.set('page', page);
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
      .then((res) =>
        setPages({
          objective: res?.data?.objective ?? null,
          pages: res?.data?.pages ?? [],
        }),
      )
      .catch(() => setPages({ objective: null, pages: [] }));
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
      const exists = p.pages.some((i) => i.id === page.id);
      return {
        ...p,
        pages: exists
          ? p.pages.map((i) => (i.id === page.id ? { ...i, ...page } : i))
          : [page, ...p.pages],
      };
    });
  }, []);

  const togglePage = useCallback((id: string) => {
    setOpenPages((open) => {
      const next = new Set(open);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  // Opening a page deep in the tree opens the pages above it in the sidebar.
  const allPages = pages?.pages;
  useEffect(() => {
    if (!pageId || !allPages) return;
    const above = ancestorPages(allPages, pageId);
    if (!above.length) return;
    setOpenPages((open) =>
      above.every((p) => open.has(p.id))
        ? open
        : new Set([...Array.from(open), ...above.map((p) => p.id)]),
    );
  }, [pageId, allPages]);

  const newPage = async (parentId: string | null) => {
    setCreatingIn(parentId);
    try {
      const res = await PortalSdk.postData(`/api/projects/${projectId}/pages`, {
        kind: 'IDEA',
        title: '',
        emoji: '📄',
        parentId,
      });
      const page: Page = res?.data?.page;
      savePage(page);
      setPagesOpen(true);
      if (parentId) setOpenPages((open) => new Set(open).add(parentId));
      select('pages', page.id);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setCreatingIn(undefined);
    }
  };

  const deletePage = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await PortalSdk.deleteData(
        `/api/projects/${projectId}/pages/${deleting.id}`,
        {},
      );
      const gone = new Set<string>(res?.data?.deleted ?? [deleting.id]);
      setPages(
        (p) => p && { ...p, pages: p.pages.filter((i) => !gone.has(i.id)) },
      );
      setDeleting(null);
      select('pages', deleting.parentId ?? null);
      toast.success('Page deleted');
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
            <Link href={APP_ROUTES.projects} className="text-sm text-sky-300">
              All projects
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
  const all = pages?.pages ?? [];
  const page = all.find((i) => i.id === pageId) ?? null;
  const trail = page ? ancestorPages(all, page.id) : [];
  const nestedCount = deleting ? descendantIds(all, deleting.id).size : 0;
  const isDoc = view === 'objective' || (view === 'pages' && !!page);
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
      case 'pages':
        return page ? (
          <PageDoc
            key={page.id}
            projectId={project.id}
            page={page}
            kind="IDEA"
            canEdit={canEdit}
            defaultEmoji="📄"
            titlePlaceholder="Untitled"
            bodyPlaceholder="Start writing. Press / for headings, lists and to-dos…"
            onSaved={savePage}
            onSaveState={setSaveState}
          >
            <PagesInside
              parent={page}
              pages={[...all].sort(byCreation)}
              canEdit={canEdit}
              creating={creatingIn === page.id}
              onOpen={(id) => select('pages', id)}
              onCreate={() => newPage(page.id)}
            />
          </PageDoc>
        ) : (
          <PagesGallery
            pages={all}
            canEdit={canEdit}
            creating={creatingIn === null}
            onOpen={(id) => select('pages', id)}
            onCreate={() => newPage(null)}
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
        pageId={pageId}
        pagesOpen={pagesOpen}
        openPages={openPages}
        canEdit={canEdit}
        creatingIn={creatingIn}
        onPagesOpen={setPagesOpen}
        onTogglePage={togglePage}
        onSelect={select}
        onNewPage={newPage}
        onNewSub={() => setAddingSub(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.07] px-4 text-sm">
          <Link
            href={APP_ROUTES.projects}
            className="text-neutral-500 hover:text-white md:hidden"
            aria-label="All projects"
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
          {trail.map((above) => (
            <span key={above.id} className="flex min-w-0 items-center gap-2">
              <Icon
                name="chevron_right"
                className="text-[16px] text-neutral-700"
              />
              <button
                type="button"
                onClick={() => select('pages', above.id)}
                className="truncate text-neutral-400 hover:text-white"
              >
                {pageTitle(above)}
              </button>
            </span>
          ))}
          {page && (
            <>
              <Icon
                name="chevron_right"
                className="text-[16px] text-neutral-700"
              />
              <span className="truncate text-neutral-400">
                {pageTitle(page)}
              </span>
            </>
          )}
          <div className="flex-1" />
          {isDoc && canEdit && <SaveBadge state={saveState} />}
          {page && canEdit && (
            <button
              type="button"
              onClick={() => setDeleting(page)}
              aria-label="Delete page"
              title="Delete page"
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
              key={`${view}:${pageId ?? ''}`}
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
        title={`Delete ${deleting ? pageTitle(deleting) : 'this page'}?`}
        message={
          nestedCount
            ? `It goes away for everyone on the project, with the ${nestedCount} ${
                nestedCount === 1 ? 'page' : 'pages'
              } inside it.`
            : 'It goes away for everyone on the project.'
        }
        confirmLabel="Delete page"
        loading={busy}
        onConfirm={deletePage}
      />
      <NewProjectDialog
        open={addingSub}
        onOpenChange={setAddingSub}
        projects={data.tree ?? []}
        companyId={project.companyId}
        parentId={project.id}
        onDone={(result) => {
          if (result.kind === 'created')
            router.push(`${APP_ROUTES.projects}/${result.projectId}`);
          else load();
        }}
      />
      <Toaster theme="dark" position="bottom-right" richColors />
    </div>
  );
};
