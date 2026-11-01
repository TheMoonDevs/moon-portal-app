'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { childrenOf, descendantsOf } from '@/lib/workspace/projectProgress';
import { APP_ROUTES } from '@/utils/constants/appInfo';

import { Icon } from '../Admin/shared/AdminUI';
import { CompanyMark } from '../Admin/Workspace/shared';
import {
  type OverviewCompany,
  type OverviewProject,
  pulseOf,
  PULSES,
} from './overview';

const Row = ({
  project,
  all,
  depth,
  open,
  toggle,
  query,
}: {
  project: OverviewProject;
  all: OverviewProject[];
  depth: number;
  open: Set<string>;
  toggle: (id: string) => void;
  /** While searching, every match shows with the projects above it. */
  query: string;
}) => {
  const subs = childrenOf(all, project.id).filter(
    (c) => !query || matches(c, all, query),
  );
  const expanded = !!query || open.has(project.id);
  const pulse = pulseOf(project);
  return (
    <li>
      <div
        className="group flex items-center rounded-lg transition-colors hover:bg-white/[0.05]"
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
          title={`${project.name} · ${PULSES[pulse].label}`}
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-2 text-[13px] text-neutral-400 outline-none focus-visible:text-white group-hover:text-white"
        >
          <span
            className="size-2 shrink-0 rounded-[3px]"
            style={{ backgroundColor: project.color || '#737373' }}
          />
          <span className="truncate">{project.name}</span>
          {project.isCore && (
            <span className="shrink-0 rounded bg-white/[0.06] px-1 text-[9px] font-semibold uppercase tracking-wider text-neutral-500">
              Core
            </span>
          )}
          <span
            className={cn(
              'ml-auto size-1.5 shrink-0 rounded-full',
              PULSES[pulse].dot,
            )}
          />
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
            />
          ))}
        </ul>
      )}
    </li>
  );
};

/** The project, or one under it, has the words in its name. */
const matches = (p: OverviewProject, all: OverviewProject[], query: string) =>
  [p, ...descendantsOf(all, p.id)].some((x) =>
    x.name.toLowerCase().includes(query),
  );

/**
 * Every project the person can see, company by company, with sub-projects
 * nested under the project above them. Clicking one opens it.
 */
export const ProjectsSidebar = ({
  companies,
  all,
}: {
  companies: OverviewCompany[];
  all: OverviewProject[];
}) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [closedCompanies, setClosedCompanies] = useState<Set<string>>(
    new Set(),
  );
  const query = search.trim().toLowerCase();

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

  const flip = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  return (
    <nav
      aria-label="All projects"
      className="flex h-full flex-col border-r border-white/[0.06] bg-neutral-950"
    >
      <div className="px-3 pb-2 pt-8 md:pt-12">
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          All projects
        </p>
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
      <div className="no-scrollbar flex-1 overflow-y-auto px-3 pb-8">
        {tree.length === 0 && (
          <p className="px-2 py-3 text-xs text-neutral-500">
            {query ? 'No project by that name.' : 'No projects yet.'}
          </p>
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
