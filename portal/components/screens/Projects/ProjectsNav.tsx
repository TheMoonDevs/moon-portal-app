'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { projectLabelInCompany } from '@/lib/workspace/projectLabel';
import { APP_ROUTES } from '@/utils/constants/appInfo';

import { Icon } from '../Admin/shared/AdminUI';
import { CompanyMark } from '../Admin/Workspace/shared';

export type NavCompany = {
  id: string;
  name: string;
  color: string | null;
  logo: string | null;
  isPersonal?: boolean;
  canEdit?: boolean;
};

export type NavProject = {
  id: string;
  companyId: string;
  name: string;
  color?: string | null;
  logo?: string | null;
  parentId?: string | null;
  isCore?: boolean | null;
  status?: string | null;
};

export type NavData = { companies: NavCompany[]; projects: NavProject[] };

const childrenOf = (all: NavProject[], id: string) =>
  all.filter((p) => p.parentId === id);

const descendantsOf = (all: NavProject[], id: string): NavProject[] =>
  childrenOf(all, id).flatMap((c) => [c, ...descendantsOf(all, c.id)]);

/** The project, or one under it, has the words in its name. */
const matches = (p: NavProject, all: NavProject[], query: string) =>
  [p, ...descendantsOf(all, p.id)].some((x) =>
    x.name.toLowerCase().includes(query),
  );

const flip = (set: Set<string>, id: string) => {
  const next = new Set(set);
  if (!next.delete(id)) next.add(id);
  return next;
};

const Row = ({
  project,
  all,
  depth,
  open,
  toggle,
  query,
  activeId,
  label,
}: {
  project: NavProject;
  all: NavProject[];
  depth: number;
  open: Set<string>;
  toggle: (id: string) => void;
  /** While searching, every match shows with the projects above it. */
  query: string;
  activeId: string | null;
  label: (p: NavProject) => string;
}) => {
  const subs = childrenOf(all, project.id).filter(
    (c) => !query || matches(c, all, query),
  );
  const expanded = !!query || open.has(project.id);
  const active = activeId === project.id;
  return (
    <li>
      <div
        className={cn(
          'group flex items-center rounded-lg transition-colors',
          active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]',
        )}
        style={{ paddingLeft: depth * 14 }}
      >
        {subs.length ? (
          <button
            type="button"
            aria-label={expanded ? 'Hide sub-projects' : 'Show sub-projects'}
            aria-expanded={expanded}
            onClick={() => toggle(project.id)}
            className="flex size-6 shrink-0 items-center justify-center rounded text-neutral-500 hover:text-white"
          >
            <Icon
              name="chevron_right"
              className={cn(
                'text-[16px] transition-transform',
                expanded && 'rotate-90',
              )}
            />
          </button>
        ) : (
          <span className="size-6 shrink-0" />
        )}
        <Link
          href={`${APP_ROUTES.projects}/${project.id}`}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-2 text-[13px] outline-none focus-visible:text-white',
            active
              ? 'font-medium text-white'
              : 'text-neutral-400 group-hover:text-white',
          )}
        >
          <span
            className="size-2 shrink-0 rounded-[3px]"
            style={{ backgroundColor: project.color || '#737373' }}
          />
          <span className="truncate">{label(project)}</span>
          {project.status && project.status !== 'ACTIVE' && (
            <span
              title="Not active"
              className="ml-auto size-1.5 shrink-0 rounded-full bg-neutral-600"
            />
          )}
        </Link>
      </div>
      {expanded && subs.length > 0 && (
        <ul>
          {subs.map((c) => (
            <Row
              key={c.id}
              project={c}
              all={all}
              depth={depth + 1}
              open={open}
              toggle={toggle}
              query={query}
              activeId={activeId}
              label={label}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

const NavSkeleton = () => (
  <div className="flex flex-col gap-2 px-2 pt-3">
    {[70, 55, 62, 48, 66].map((w, i) => (
      <div
        key={i}
        className="h-3 animate-pulse rounded bg-white/[0.05]"
        style={{ width: `${w}%`, marginLeft: i % 3 ? 22 : 0 }}
      />
    ))}
  </div>
);

/**
 * The projects sidebar: Home at the top, then every project the person can
 * see, company by company, with sub-projects nested under the project above
 * them. The open project is highlighted and the projects above it open.
 */
export const ProjectsNav = ({
  data,
  backTo,
  onBack,
}: {
  data: NavData | null;
  /** The menu to go back to (a project's Pages or Plans), if any. */
  backTo?: string | null;
  onBack?: () => void;
}) => {
  const pathname = usePathname() ?? '';
  const activeId =
    pathname.startsWith(`${APP_ROUTES.projects}/`) &&
    pathname.split('/')[2] !== undefined
      ? pathname.split('/')[2]
      : null;
  const atHome = pathname === APP_ROUTES.projects;

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [closedCompanies, setClosedCompanies] = useState<Set<string>>(
    new Set(),
  );
  const query = search.trim().toLowerCase();
  const all = useMemo(() => data?.projects ?? [], [data]);
  const companies = useMemo(() => data?.companies ?? [], [data]);
  const companyName = useMemo(
    () => new Map(companies.map((c) => [c.id, c.name])),
    [companies],
  );
  const label = (p: NavProject) =>
    projectLabelInCompany(p, companyName.get(p.companyId));

  // The open project's company and the projects above it stay open.
  useEffect(() => {
    if (!activeId) return;
    const byId = new Map(all.map((p) => [p.id, p]));
    const active = byId.get(activeId);
    if (!active) return;
    const above: string[] = [];
    for (let p = active; p.parentId && byId.has(p.parentId); ) {
      above.push(p.parentId);
      p = byId.get(p.parentId)!;
    }
    setOpen((s) =>
      above.every((id) => s.has(id))
        ? s
        : new Set([...Array.from(s), ...above]),
    );
    setClosedCompanies((s) => {
      if (!s.has(active.companyId)) return s;
      const next = new Set(s);
      next.delete(active.companyId);
      return next;
    });
  }, [activeId, all]);

  const tree = useMemo(() => {
    const byId = new Map(all.map((p) => [p.id, p]));
    return companies
      .map((company) => ({
        company,
        projects: all
          .filter(
            (p) =>
              p.companyId === company.id &&
              (!p.parentId || !byId.has(p.parentId)),
          )
          .filter((p) => !query || matches(p, all, query))
          // The core project first, then by name.
          .sort(
            (a, b) =>
              Number(!!b.isCore) - Number(!!a.isCore) ||
              a.name.localeCompare(b.name),
          ),
      }))
      .filter((g) => g.projects.length);
  }, [companies, all, query]);

  return (
    <nav aria-label="Projects" className="flex h-full min-h-0 flex-col">
      <div className="px-3 pb-2 pt-6 md:pt-8">
        {backTo && (
          <button
            type="button"
            onClick={onBack}
            className="mb-2 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-neutral-500 transition-colors hover:bg-white/[0.04] hover:text-neutral-200"
          >
            <Icon name="arrow_back" className="text-[15px]" />
            Back to {backTo}
          </button>
        )}
        <Link
          href={APP_ROUTES.projects}
          aria-current={atHome ? 'page' : undefined}
          className={cn(
            'mb-3 flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors',
            atHome
              ? 'bg-white/[0.08] text-white'
              : 'text-neutral-300 hover:bg-white/[0.05] hover:text-white',
          )}
        >
          <Icon name="home" filled={atHome} className="text-[19px]" />
          Home
        </Link>
        <label className="flex h-8 items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 text-neutral-500 focus-within:bg-white/[0.07] focus-within:text-neutral-300">
          <Icon name="search" className="text-[16px]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a project"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-neutral-600"
          />
        </label>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-8">
        {!data ? (
          <NavSkeleton />
        ) : (
          tree.length === 0 && (
            <p className="px-2 py-3 text-xs text-neutral-500">
              {query ? 'No project by that name.' : 'No projects yet.'}
            </p>
          )
        )}
        {tree.map(({ company, projects }) => {
          const shut = !query && closedCompanies.has(company.id);
          return (
            <div key={company.id} className="pt-3">
              <button
                type="button"
                aria-expanded={!shut}
                onClick={() => setClosedCompanies((s) => flip(s, company.id))}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs font-semibold text-neutral-300 hover:bg-white/[0.04]"
              >
                <CompanyMark
                  name={company.name}
                  color={company.color}
                  logo={company.logo}
                  size={18}
                />
                <span className="flex-1 truncate">{company.name}</span>
                {company.isPersonal && (
                  <Icon name="lock" className="text-[13px] text-neutral-500" />
                )}
                <Icon
                  name="expand_more"
                  className={cn(
                    'text-[16px] text-neutral-500 transition-transform',
                    shut && '-rotate-90',
                  )}
                />
              </button>
              {!shut && (
                <ul className="mt-0.5">
                  {projects.map((p) => (
                    <Row
                      key={p.id}
                      project={p}
                      all={all}
                      depth={0}
                      open={open}
                      toggle={(id) => setOpen((s) => flip(s, id))}
                      query={query}
                      activeId={activeId}
                      label={label}
                    />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
};
