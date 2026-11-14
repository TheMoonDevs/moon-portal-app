'use client';

import type { ProjectPage as Page, User } from '@db/client';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast, Toaster } from 'sonner';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { BrandKit } from '@/lib/brandKit';
import { cn } from '@/lib/utils';
import { projectLabelInCompany } from '@/lib/workspace/projectLabel';
import {
  ancestorPages,
  childPages,
  descendantIds,
} from '@/lib/workspace/projectPages';
import { isRestricted, limitingParent } from '@/lib/workspace/sharing';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
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
import { useChat } from '../Messages/ChatProvider';
import type { PlanView } from '../Plans/types';
import { usePlans } from '../Plans/usePlans';
import { NewProjectDialog } from '../Projects/NewProjectDialog';
import { NavMenuButton, useProjectsShell } from '../Projects/ProjectsShell';
import { bannerOf, kitColors, kitImages, pickKit } from './brand';
import type { DocLinks } from './DocEditor';
import { PageDoc, SaveBadge, type SaveState } from './PageDoc';
import { ProjectDetailsDialog } from './ProjectDetailsDialog';
import { GoalsSection } from './sections/GoalsSection';
import { KpiSection } from './sections/KpiSection';
import { MembersSection } from './sections/MembersSection';
import { PagesGallery, PagesInside } from './sections/PagesSection';
import { plansFor, PlansSection } from './sections/PlansSection';
import { ProjectHome } from './sections/ProjectHome';
import { WorklogsSection } from './sections/WorklogsSection';
import { ShareButton, type ShareChange, ShareDialog } from './ShareDialog';
import {
  byCreation,
  type PagesData,
  pageTitle,
  type ProjectData,
  tabOf,
  TABS,
  viewFrom,
  type ViewKey,
} from './types';

/* -------------------------------------------------------------------------- */
/*                      The nested menu (Pages, Plans)                        */
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
            (canEdit || isRestricted(page)) && (
              <span className="-mr-1 flex items-center gap-0.5">
                {isRestricted(page) && (
                  <span
                    title="Restricted: only the people it is shared with"
                    className="flex"
                  >
                    <Icon
                      name="lock"
                      className="text-[13px] text-amber-200/70"
                    />
                  </span>
                )}
                {canEdit && (
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

/** A plan's status as a dot in the sidebar. */
const PLAN_DOT: Record<string, string> = {
  IDEA: 'bg-amber-300/80',
  ACTIVE: 'bg-sky-400',
  DONE: 'bg-emerald-400',
  DROPPED: 'bg-neutral-600',
};

/**
 * The project's pages (with pages inside pages) or its plans, shown in the
 * projects sidebar on the left while the Pages or Plans tab is open.
 */
const NestedMenu = ({
  kind,
  name,
  project,
  pages,
  view,
  pageId,
  openPages,
  canEdit,
  creatingIn,
  onTogglePage,
  onSelect,
  onNewPage,
  plans,
  planId,
  canAddPlan,
  creatingPlan,
  onNewPlan,
}: {
  kind: 'pages' | 'plans';
  name: string;
  project: ProjectData['project'];
  pages: PagesData | null;
  view: ViewKey;
  pageId: string | null;
  openPages: Set<string>;
  canEdit: boolean;
  creatingIn: string | null | undefined;
  onTogglePage: (id: string) => void;
  onSelect: (view: ViewKey, id?: string | null) => void;
  onNewPage: (parentId: string | null) => void;
  plans: PlanView[] | null;
  planId: string | null;
  canAddPlan: boolean;
  creatingPlan: boolean;
  onNewPlan: () => void;
}) => {
  const all = useMemo(
    () => [...(pages?.pages ?? [])].sort(byCreation),
    [pages?.pages],
  );
  const top = childPages(all, null);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2.5 px-5 py-3">
        <CompanyMark
          name={name}
          color={project.color}
          logo={project.logo}
          size={28}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{name}</p>
          <p className="text-[11px] text-neutral-500">
            {kind === 'pages' ? 'Pages' : 'Plans'}
          </p>
        </div>
      </div>
      <nav className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-8">
        <LayoutGroup id="project-nested">
          {kind === 'pages' ? (
            <div className="flex flex-col">
              <NavItem
                icon="apps"
                label="All pages"
                active={view === 'pages' && !pageId}
                onClick={() => onSelect('pages', null)}
                badge={
                  all.length > 0 && (
                    <span className="text-[11px] text-neutral-600">
                      {all.length}
                    </span>
                  )
                }
              />
              <NavItem
                icon=""
                label="Objective"
                active={view === 'objective'}
                onClick={() => onSelect('objective')}
                badge={
                  <span className="order-first flex items-center gap-1">
                    <span className="size-4" />
                    <span className="text-sm leading-none">
                      {pages?.objective?.emoji || '🎯'}
                    </span>
                  </span>
                }
                trailing={
                  <Icon
                    name="push_pin"
                    className="text-[13px] text-neutral-600"
                  />
                }
              />
              <div className="my-1.5 h-px bg-white/[0.05]" />
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
          ) : (
            <div className="flex flex-col">
              <NavItem
                icon="apps"
                label="All plans"
                active={view === 'plans' && !planId}
                onClick={() => onSelect('plans', null)}
                badge={
                  !!plans?.length && (
                    <span className="text-[11px] text-neutral-600">
                      {plans.length}
                    </span>
                  )
                }
              />
              <div className="my-1.5 h-px bg-white/[0.05]" />
              {plans === null && (
                <p className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-neutral-600">
                  <Spin className="size-3" /> Loading plans
                </p>
              )}
              {plans?.map((plan) => (
                <NavItem
                  key={plan.id}
                  icon=""
                  label={plan.title || 'Untitled plan'}
                  active={view === 'plans' && planId === plan.id}
                  onClick={() => onSelect('plans', plan.id)}
                  badge={
                    <span
                      className={cn(
                        'order-first -mr-1 size-1.5 shrink-0 rounded-full',
                        PLAN_DOT[plan.status] ?? 'bg-neutral-600',
                      )}
                    />
                  }
                />
              ))}
              {canAddPlan && (
                <button
                  type="button"
                  onClick={onNewPlan}
                  disabled={creatingPlan}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-500 transition-colors hover:bg-white/[0.04] hover:text-neutral-200"
                >
                  {creatingPlan ? (
                    <Spin className="size-3" />
                  ) : (
                    <Icon name="add" className="text-[15px]" />
                  )}
                  New plan
                </button>
              )}
              {!canAddPlan && plans?.length === 0 && (
                <p className="px-2.5 py-1.5 text-xs text-neutral-600">
                  No plans yet
                </p>
              )}
            </div>
          )}
        </LayoutGroup>
      </nav>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                             Banner and identity                            */
/* -------------------------------------------------------------------------- */

/** The wide image at the top: picked, the brand kit's, or a soft gradient. */
const Banner = ({
  image,
  color,
  second,
  images,
  canChange,
  onChange,
}: {
  image: string | null;
  color: string;
  second: string | null;
  /** The brand kit's images, to pick from. */
  images: string[];
  canChange: boolean;
  onChange: (image: string | null) => Promise<void>;
}) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<string | null | undefined>();
  const pick = async (url: string | null) => {
    setSaving(url);
    await onChange(url);
    setSaving(undefined);
    setOpen(false);
  };
  return (
    <div
      className="relative h-32 overflow-hidden md:h-48"
      style={{
        background: `linear-gradient(120deg, ${color} 0%, ${second ?? color}${second ? '' : '80'} 100%)`,
      }}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <svg
          aria-hidden
          className="absolute inset-0 size-full"
          viewBox="0 0 320 100"
          preserveAspectRatio="none"
        >
          <circle cx="270" cy="12" r="58" fill="#fff" opacity={0.08} />
          <circle cx="300" cy="96" r="34" fill="#fff" opacity={0.06} />
          <circle cx="40" cy="104" r="44" fill="#000" opacity={0.08} />
        </svg>
      )}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-neutral-950/60 to-transparent" />
      {canChange && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="absolute right-3 top-3 flex h-8 items-center gap-1.5 rounded-lg bg-black/45 px-2.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-black/60"
            >
              <Icon name="photo" className="text-[16px]" />
              <span className="hidden sm:inline">Change banner</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-80 border-white/10 bg-neutral-900 p-3 text-neutral-100"
          >
            <p className="mb-2 text-xs font-semibold text-neutral-300">
              Pick from the brand kit
            </p>
            {images.length ? (
              <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto">
                {images.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => pick(url)}
                    className={cn(
                      'relative aspect-[3/1] overflow-hidden rounded-lg border',
                      image === url
                        ? 'border-white'
                        : 'border-white/10 hover:border-white/40',
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="size-full object-cover" />
                    {saving === url && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Spin className="size-4" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">
                The brand kit has no images yet. Add some with Edit, under Brand
                kit.
              </p>
            )}
            <button
              type="button"
              onClick={() => pick(null)}
              className="mt-3 w-full rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/[0.1]"
            >
              {saving === null ? 'Saving…' : 'Use the kit’s own banner'}
            </button>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

const HeaderButton = ({
  icon,
  label,
  onClick,
  href,
  primary,
  title,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  href?: string;
  primary?: boolean;
  title?: string;
}) => {
  const className = cn(
    'flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors',
    primary
      ? 'bg-white text-neutral-950 hover:opacity-90'
      : 'bg-white/[0.06] text-neutral-200 hover:bg-white/[0.1] hover:text-white',
  );
  const body = (
    <>
      <Icon name={icon} className="text-[17px]" />
      <span>{label}</span>
    </>
  );
  return href ? (
    <Link href={href} title={title} className={className}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} title={title} className={className}>
      {body}
    </button>
  );
};

/** A PERSONAL's note, under its name. */
const PersonalHint = () => (
  <p className="mt-3 flex max-w-2xl items-start gap-1.5 rounded-lg border border-teal-400/15 bg-teal-400/[0.06] p-2.5 text-xs leading-relaxed text-teal-100/80">
    <Icon name="lock" className="mt-px text-[13px] text-teal-200" />
    Just for you. Your own goals and habits go here: gym, exercise, reading,
    learning or any other self-help. Nobody else can see it.
  </p>
);

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */

export const ProjectPage = ({ projectId }: { projectId: string }) => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { companies, can, canInProject } = useWorkspace();
  const { me } = useChat();

  const [data, setData] = useState<ProjectData | null>(null);
  const [addingSub, setAddingSub] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<PagesData | null>(null);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [openPages, setOpenPages] = useState<Set<string>>(new Set());
  /** The parent a new page is being made in: null at the top level. */
  const [creatingIn, setCreatingIn] = useState<string | null | undefined>();
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [deleting, setDeleting] = useState<Page | null>(null);
  const [sharing, setSharing] = useState(false);
  const { user: meUser } = useUser();
  const [busy, setBusy] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  /** Plans made here, listed even before they have a step for the project. */
  const [madeHere, setMadeHere] = useState<Set<string>>(new Set());
  const { slot, setNested, refreshNav } = useProjectsShell();
  const scroller = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Old links (Tasks in Action, Worklogs, ideas, schedule) open their tab.
  const view: ViewKey = viewFrom(params?.get('view'));
  const tab = tabOf(view);
  const pageId =
    view === 'pages'
      ? (params?.get('page') ?? params?.get('idea') ?? null)
      : null;
  const planId = view === 'plans' ? (params?.get('plan') ?? null) : null;

  /** Opens a view, and a page or plan in it. */
  const select = useCallback(
    (next: ViewKey, id?: string | null) => {
      const q = new URLSearchParams({ view: next });
      if (id) q.set(next === 'plans' ? 'plan' : 'page', id);
      setSaveState('idle');
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
      // Scrolled past the banner: the new tab starts under the tabs.
      const box = scroller.current;
      const tabs = tabsRef.current;
      if (box && tabs && box.scrollTop > tabs.offsetTop)
        box.scrollTo({ top: tabs.offsetTop });
    },
    [router, pathname],
  );

  // Pages and Plans put their menu in the sidebar on the left.
  const nestedKind: 'pages' | 'plans' | null =
    tab === 'pages' ? 'pages' : tab === 'plans' ? 'plans' : null;
  const projectTitle = data?.project.name;
  useEffect(() => {
    setNested(
      nestedKind && projectTitle
        ? `${projectTitle} ${nestedKind === 'pages' ? 'pages' : 'plans'}`
        : null,
    );
  }, [nestedKind, projectTitle, setNested]);
  useEffect(() => () => setNested(null), [setNested]);

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

  const plans = usePlans(companyId);
  const linkedPlans = useMemo(
    () => (plans.data ? plansFor(plans.data.plans, projectId, madeHere) : null),
    [plans.data, projectId, madeHere],
  );

  const keepPlan = useCallback(
    (plan: PlanView) => setMadeHere((ids) => new Set(ids).add(plan.id)),
    [],
  );

  const newPlan = async () => {
    setCreatingPlan(true);
    // Linked to this project; it can be made a grand plan later.
    const created = await plans.create({ projectId });
    setCreatingPlan(false);
    if (!created) return;
    keepPlan(created);
    select('plans', created.id);
  };

  const companyName = useMemo(
    () => companies.find((c) => c.company.id === companyId)?.company.name,
    [companies, companyId],
  );
  // The viewer's own PERSONAL: no team, chat or sharing there.
  const personal = !!companies.find((c) => c.company.id === companyId)?.company
    .isPersonal;

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

  /**
   * Makes a page in `parentId` (the top level when null) and opens it, or
   * with `stay`, only returns it (the "/page" command links it first).
   */
  const newPage = async (
    parentId: string | null,
    { stay = false }: { stay?: boolean } = {},
  ): Promise<Page | null> => {
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
      if (parentId) setOpenPages((open) => new Set(open).add(parentId));
      if (!stay) select('pages', page.id);
      return page;
    } catch (err) {
      toast.error(errorText(err));
      return null;
    } finally {
      setCreatingIn(undefined);
    }
  };

  /** What a page's editor can link to, and "/page" to make one inside it. */
  const linksFor = (parentId: string | null, canMake: boolean): DocLinks => ({
    pages: (pages?.pages ?? []).map((p) => ({
      id: p.id,
      title: pageTitle(p),
      emoji: p.emoji,
    })),
    currentId: parentId,
    open: (id) => select('pages', id),
    create: canMake
      ? async () => {
          const made = await newPage(parentId, { stay: true });
          return made
            ? { id: made.id, title: pageTitle(made), emoji: made.emoji }
            : null;
        }
      : undefined,
  });

  /** Sets who can open a page (and the pages inside it). */
  const sharePage = async (target: Page, change: ShareChange) => {
    try {
      const res = await PortalSdk.putData(
        `/api/projects/${projectId}/pages/${target.id}/sharing`,
        change,
      );
      const saved: Page | undefined = res?.data?.page;
      if (saved) savePage(saved);
      toast.success(
        change.restricted
          ? 'Only the people you picked can open it now'
          : 'Everyone on the project can open it',
      );
      return true;
    } catch (err) {
      toast.error(errorText(err, 'Could not change who can open it.'));
      return false;
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
      <div className="absolute inset-0 flex items-center justify-center">
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
      <div className="absolute inset-0 flex items-center justify-center">
        <Spin className="size-5" />
      </div>
    );

  const { project, tasks, people } = data;
  // The company's name opens its CORE project.
  const coreId = data.tree?.find((p) => p.isCore)?.id;
  // The company's core project reads "ZONE (Core)".
  const projectName = projectLabelInCompany(
    { ...project, isCore: coreId === project.id, isPersonal: personal },
    companyName,
  );
  const canEdit = can(project.companyId, 'projects:edit');
  // The project's group chat is for its team (everyone, for CORE).
  const onTeam =
    !!data.tree?.find((p) => p.id === project.id)?.isCore ||
    (!!me && people.some((p) => p.id === me));
  const all = pages?.pages ?? [];
  const page = all.find((i) => i.id === pageId) ?? null;
  const trail = page ? ancestorPages(all, page.id) : [];
  const nestedCount = deleting ? descendantIds(all, deleting.id).size : 0;
  const isDoc = view === 'objective' || (view === 'pages' && !!page);
  const openPlan = linkedPlans?.find((p) => p.id === planId) ?? null;

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
            links={linksFor(null, canEdit)}
          />
        ) : null;
      case 'kpi':
        return <KpiSection project={project} tasks={tasks} />;
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
            bodyPlaceholder="Start writing. Press / for blocks, or /page for a page inside…"
            onSaved={savePage}
            onSaveState={setSaveState}
            links={linksFor(page.id, canEdit)}
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
            people={people}
            companyUsers={companyUsers}
            canEdit={canEdit}
            canTick={canInProject(project, 'tasks:edit')}
            onSaved={load}
          />
        );
      case 'members':
        return (
          <div>
            <button
              type="button"
              onClick={() => select('home')}
              className="mx-auto mt-5 flex w-full max-w-5xl items-center gap-1 px-5 text-xs text-neutral-500 hover:text-neutral-200 md:px-10"
            >
              <Icon name="arrow_back" className="text-[15px]" /> Home
            </button>
            <MembersSection
              project={project}
              tasks={tasks}
              people={people}
              companyUsers={companyUsers}
              canEdit={canEdit}
              onSaved={load}
            />
          </div>
        );
      case 'home':
        return (
          <ProjectHome
            data={data}
            objective={pages?.objective ?? null}
            companyUsers={companyUsers}
            canEdit={canEdit}
            canAdd={canInProject(project, 'tasks:create')}
            canTick={canInProject(project, 'tasks:edit')}
            canDelete={canInProject(project, 'tasks:delete')}
            onSaved={load}
            onOpen={(v) => select(v)}
          />
        );
      case 'logs':
        return <WorklogsSection projectId={project.id} tasks={tasks} />;
      case 'plans':
        return (
          <PlansSection
            projectId={project.id}
            plans={plans}
            linked={linkedPlans ?? []}
            planId={planId}
            onOpen={(id) => select('plans', id)}
            onCreated={keepPlan}
          />
        );
    }
  })();

  const companyRecord = companies.find(
    (c) => c.company.id === project.companyId,
  )?.company as
    | {
        brandKit?: BrandKit | null;
        color?: string | null;
        logo?: string | null;
      }
    | undefined;
  const isCore = coreId === project.id;
  const kit = pickKit(
    project.brandKit as BrandKit | null | undefined,
    isCore ? companyRecord?.brandKit : null,
  );
  const banner = project.headerImage ?? bannerOf(kit);
  const colors = kitColors(kit);
  const mainColor =
    project.color || colors.main || companyRecord?.color || '#6366f1';
  const images = kitImages(
    project.brandKit as BrandKit | null | undefined,
    isCore ? companyRecord?.brandKit : null,
  );
  const isLead = !!me && (project.leadIds ?? []).includes(me);
  const parent = data.tree?.find((p) => p.id === project.parentId);
  const status =
    PROJECT_STATUS_META[project.status] ?? PROJECT_STATUS_META.ACTIVE;
  const openCount = tasks.filter((t) =>
    ['TODO', 'IN_PROGRESS', 'IN_REVIEW'].includes(t.status),
  ).length;
  const logo = project.logo || (isCore ? companyRecord?.logo : null) || null;

  const changeBanner = async (image: string | null) => {
    try {
      await PortalSdk.putData(`/api/projects/${project.id}/header`, { image });
      load();
    } catch (err) {
      toast.error(errorText(err, 'Could not change the banner.'));
    }
  };

  return (
    <div
      ref={scroller}
      className="custom-scrollbar absolute inset-0 overflow-y-auto pb-[72px] md:pb-0"
    >
      {nestedKind &&
        slot &&
        createPortal(
          <NestedMenu
            kind={nestedKind}
            name={projectName}
            project={project}
            pages={pages}
            view={view}
            pageId={pageId}
            openPages={openPages}
            canEdit={canEdit}
            creatingIn={creatingIn}
            onTogglePage={togglePage}
            onSelect={select}
            onNewPage={newPage}
            plans={linkedPlans}
            planId={planId}
            canAddPlan={plans.canCreate}
            creatingPlan={creatingPlan}
            onNewPlan={newPlan}
          />,
          slot,
        )}

      <Banner
        image={banner}
        color={mainColor}
        second={colors.second}
        images={images}
        canChange={(isLead || canEdit) && !personal}
        onChange={changeBanner}
      />

      {/* Who the project is */}
      <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <div className="relative z-10 -mt-10 shrink-0 rounded-[22px] bg-neutral-950 p-1 md:-mt-12">
            <CompanyMark
              name={projectName}
              color={mainColor}
              logo={logo}
              size={88}
            />
          </div>
          <div className="min-w-0 flex-1 pt-2">
            <h1 className="truncate text-2xl font-bold tracking-tight text-white md:text-[28px]">
              {projectName}
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500">
              {personal ? (
                <span className="flex items-center gap-1">
                  <Icon name="lock" className="text-[14px]" /> Only you
                </span>
              ) : coreId && !isCore ? (
                <Link
                  href={`${APP_ROUTES.projects}/${coreId}`}
                  title={`Open ${companyName ?? 'the company'}'s core project`}
                  className="hover:text-white"
                >
                  {companyName}
                </Link>
              ) : (
                <span>{isCore ? 'Company work' : companyName}</span>
              )}
              {parent && (
                <>
                  <span className="text-neutral-700">·</span>
                  <Link
                    href={`${APP_ROUTES.projects}/${parent.id}`}
                    className="flex items-center gap-0.5 hover:text-white"
                  >
                    <Icon
                      name="subdirectory_arrow_right"
                      className="text-[14px]"
                    />
                    {parent.name}
                  </Link>
                </>
              )}
              {project.status !== 'ACTIVE' && (
                <Pill tone={status.tone}>{status.label}</Pill>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pb-1">
            {onTeam && !personal && (
              <HeaderButton
                icon="forum"
                label="Group chat"
                primary
                href={`/messages?project=${encodeURIComponent(project.id)}`}
                title="Message everyone on this project in its group chat"
              />
            )}
            {!personal && (
              <HeaderButton
                icon="account_tree"
                label="Sub-project"
                onClick={() => setAddingSub(true)}
                title="Split this project into a smaller one"
              />
            )}
            {canEdit && (
              <HeaderButton
                icon="edit"
                label="Edit"
                onClick={() => setEditingDetails(true)}
                title="Edit project details and brand kit"
              />
            )}
          </div>
        </div>
        {personal ? (
          <PersonalHint />
        ) : (
          project.description && (
            <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-relaxed text-neutral-400">
              {project.description}
            </p>
          )
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-neutral-500">
          {people.length > 0 && (
            <button
              type="button"
              onClick={() => select('members')}
              className="flex items-center gap-2 hover:text-neutral-200"
            >
              <AvatarStack users={people} max={5} />
              {people.length} {people.length === 1 ? 'person' : 'people'}
            </button>
          )}
          <span>
            {openCount} open {openCount === 1 ? 'task' : 'tasks'}
          </span>
          {!!project.progress?.total && (
            <span>{Math.round(project.progress.percent)}% done</span>
          )}
        </div>
      </div>

      {/* Tabs, kept at the top while the page scrolls */}
      <div
        ref={tabsRef}
        className="sticky top-0 z-20 mt-4 border-b border-white/[0.07] bg-neutral-950/90 backdrop-blur"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center gap-1 px-2 md:px-6">
          <NavMenuButton />
          <div className="no-scrollbar flex min-w-0 flex-1 overflow-x-auto">
            <LayoutGroup id="project-tabs">
              {TABS.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    ref={(el) => {
                      if (active)
                        el?.scrollIntoView({
                          inline: 'nearest',
                          block: 'nearest',
                        });
                    }}
                    onClick={() => select(t.key)}
                    className={cn(
                      'relative flex h-12 shrink-0 items-center gap-1.5 px-3 text-sm font-medium transition-colors',
                      active
                        ? 'text-white'
                        : 'text-neutral-500 hover:text-neutral-200',
                    )}
                  >
                    {t.label}
                    {t.key === 'pages' && all.length > 0 && (
                      <span className="text-[11px] text-neutral-600">
                        {all.length}
                      </span>
                    )}
                    {active && (
                      <motion.span
                        layoutId="project-tab-line"
                        className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-white"
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 40,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </LayoutGroup>
          </div>
          {/* What the open page or plan can do */}
          <div className="flex shrink-0 items-center gap-1 pl-2">
            {isDoc && canEdit && <SaveBadge state={saveState} />}
            {openPlan && <SaveBadge state={plans.saveState} />}
            {page && !personal && (
              <ShareButton
                sharing={page.sharing}
                canShare={canEdit}
                onClick={() => setSharing(true)}
              />
            )}
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
          </div>
        </div>
        {/* Where you are inside Pages or Plans */}
        {(trail.length > 0 || page || openPlan || view === 'objective') && (
          <div className="mx-auto flex w-full max-w-6xl items-center gap-1.5 overflow-x-auto px-4 pb-2 text-xs text-neutral-500 md:px-8">
            <button
              type="button"
              onClick={() => select(tab)}
              className="shrink-0 hover:text-white"
            >
              {tab === 'plans' ? 'Plans' : 'Pages'}
            </button>
            {[
              ...trail.map((above) => ({
                id: above.id,
                label: pageTitle(above),
              })),
            ].map((above) => (
              <span
                key={above.id}
                className="flex shrink-0 items-center gap-1.5"
              >
                <Icon
                  name="chevron_right"
                  className="text-[14px] text-neutral-700"
                />
                <button
                  type="button"
                  onClick={() => select('pages', above.id)}
                  className="hover:text-white"
                >
                  {above.label}
                </button>
              </span>
            ))}
            <Icon
              name="chevron_right"
              className="text-[14px] text-neutral-700"
            />
            <span className="truncate text-neutral-300">
              {view === 'objective'
                ? 'Objective'
                : page
                  ? pageTitle(page)
                  : openPlan?.title || 'Untitled plan'}
            </span>
          </div>
        )}
      </div>

      <main
        className={cn(
          'min-w-0',
          openPlan && 'h-[calc(100dvh-49px)] pb-[72px] md:pb-0',
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${view}:${pageId ?? planId ?? ''}`}
            className={cn(openPlan && 'h-full')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </main>

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
      {page && canEdit && (
        <ShareDialog
          open={sharing}
          onOpenChange={setSharing}
          itemLabel="page"
          title={pageTitle(page)}
          everyoneTitle={`Everyone who can open ${projectName}`}
          everyoneHint="It follows the project: anyone who can open the project can open this page."
          insideNote="Pages inside this one follow it: whoever cannot open it cannot open them either."
          sharing={page.sharing}
          people={companyUsers}
          keepers={
            page.createdById
              ? [{ id: page.createdById, reason: 'Made this page' }]
              : []
          }
          meId={meUser?.id}
          limitedBy={(() => {
            const above = limitingParent(all, page.id);
            return above
              ? {
                  title: pageTitle(above),
                  emoji: above.emoji,
                  onOpen: () => {
                    setSharing(false);
                    select('pages', above.id);
                  },
                }
              : undefined;
          })()}
          onSave={(change) => sharePage(page, change)}
        />
      )}
      <NewProjectDialog
        open={addingSub}
        onOpenChange={setAddingSub}
        projects={data.tree ?? []}
        companyId={project.companyId}
        parentId={project.id}
        onDone={(result) => {
          refreshNav();
          if (result.kind === 'created')
            router.push(`${APP_ROUTES.projects}/${result.projectId}`);
          else load();
        }}
      />
      {canEdit && (
        <ProjectDetailsDialog
          open={editingDetails}
          onOpenChange={setEditingDetails}
          data={data}
          onSaved={() => {
            load();
            refreshNav();
          }}
        />
      )}
      <Toaster theme="dark" position="bottom-right" richColors />
    </div>
  );
};
