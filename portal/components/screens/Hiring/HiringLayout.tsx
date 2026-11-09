'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import type { WorkspaceCompany } from '@/utils/hooks/useWorkspace';

import { Icon, IconAction } from '../Admin/shared/AdminUI';

/** One row in the sidebar. Rows with `children` fold open under it. */
export interface HiringNavItem {
  id: string;
  label: string;
  icon?: string;
  /** A small coloured dot instead of an icon, e.g. an opening's status. */
  dot?: string;
  count?: number | null;
  /** Counts that need someone (new applicants, items waiting) stand out. */
  countTone?: 'muted' | 'alert';
  active?: boolean;
  dim?: boolean;
  onClick: () => void;
  children?: HiringNavItem[];
}

export interface HiringNavGroup {
  id: string;
  label: string;
  items: HiringNavItem[];
  /** A small button beside the group's name, e.g. "New opening". */
  action?: { icon: string; label: string; onClick: () => void };
  /** Shown under an empty group. */
  empty?: string;
  /**
   * A long list (openings): a filter box once it has more than a few items,
   * and the list scrolls on its own so the groups below stay in reach.
   */
  searchable?: { placeholder: string };
}

const SEARCH_FROM = 6;

const GroupItems = ({
  group,
  collapsed,
  onNavigate,
}: {
  group: HiringNavGroup;
  collapsed: boolean;
  onNavigate: () => void;
}) => {
  const [filter, setFilter] = useState('');
  const canSearch =
    !!group.searchable && !collapsed && group.items.length >= SEARCH_FROM;
  const words = filter.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const items =
    canSearch && words.length
      ? group.items.filter((item) =>
          words.every((w) => item.label.toLowerCase().includes(w)),
        )
      : group.items;
  const rows = items.map((item) => (
    <NavRow
      key={item.id}
      item={item}
      depth={0}
      collapsed={collapsed}
      onNavigate={onNavigate}
    />
  ));
  if (!group.searchable) return <>{rows}</>;
  return (
    <>
      {canSearch && (
        <div className="relative mb-1 px-1">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-neutral-600"
          />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setFilter('');
            }}
            placeholder={group.searchable.placeholder}
            aria-label={group.searchable.placeholder}
            className="h-7 w-full rounded-md border border-white/[0.07] bg-white/[0.03] pl-7 pr-2 text-xs text-neutral-200 placeholder:text-neutral-600 focus:border-white/20 focus:outline-none"
          />
        </div>
      )}
      <div className="custom-scrollbar flex max-h-[min(320px,40vh)] flex-col gap-0.5 overflow-y-auto">
        {rows}
        {canSearch && words.length > 0 && !items.length && (
          <p className="px-2.5 py-1 text-xs text-neutral-600">No match</p>
        )}
      </div>
    </>
  );
};

const COLLAPSED_KEY = 'tmd-hiring-sidebar-collapsed';
const FOLDED_KEY = 'tmd-hiring-folded-groups';

const readFolded = (): string[] => {
  try {
    const raw = localStorage.getItem(FOLDED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const CompanyLogo = ({
  company,
  size = 28,
}: {
  company?: WorkspaceCompany['company'] | null;
  size?: number;
}) => {
  const [failed, setFailed] = useState(false);
  const logo = (company as { logo?: string | null } | null)?.logo;
  return (
    <span
      style={{ width: size, height: size, fontSize: size / 2.4 }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-neutral-800 font-semibold text-neutral-300"
    >
      {logo && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        (company?.name ?? '?').slice(0, 1).toUpperCase()
      )}
    </span>
  );
};

/** The company you're hiring for, switchable from the top of the sidebar. */
const CompanySwitcher = ({
  companies,
  value,
  onChange,
  collapsed,
}: {
  companies: WorkspaceCompany[];
  value: string | null;
  onChange: (companyId: string) => void;
  collapsed: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = companies.find((c) => c.company.id === value)?.company;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={collapsed ? current?.name : undefined}
        disabled={companies.length < 2}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] p-2 text-left transition-colors enabled:hover:border-white/15 enabled:hover:bg-white/[0.06]',
          collapsed && 'justify-center border-transparent bg-transparent p-1',
        )}
      >
        <CompanyLogo company={current} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] uppercase tracking-wider text-neutral-500">
                Hiring for
              </span>
              <span className="block truncate text-sm font-medium text-white">
                {current?.name ?? 'Choose a company'}
              </span>
            </span>
            {companies.length > 1 && (
              <Icon
                name="unfold_more"
                className="text-[18px] text-neutral-500"
              />
            )}
          </>
        )}
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1 w-60 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 p-1 shadow-2xl"
        >
          {companies.map(({ company }) => (
            <button
              key={company.id}
              type="button"
              role="option"
              aria-selected={company.id === value}
              onClick={() => {
                onChange(company.id);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/[0.06]',
                company.id === value ? 'text-white' : 'text-neutral-300',
              )}
            >
              <CompanyLogo company={company} size={22} />
              <span className="min-w-0 flex-1 truncate">{company.name}</span>
              {company.id === value && (
                <Icon name="check" className="text-[16px] text-neutral-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CountBadge = ({
  count,
  tone,
  active,
}: {
  count?: number | null;
  tone?: 'muted' | 'alert';
  active?: boolean;
}) =>
  count ? (
    <span
      className={cn(
        'ml-auto shrink-0 rounded-md px-1.5 py-px text-[10px] font-semibold tabular-nums',
        tone === 'alert'
          ? 'bg-sky-500/15 text-sky-300'
          : active
            ? 'bg-white/15 text-neutral-200'
            : 'text-neutral-500',
      )}
    >
      {count}
    </span>
  ) : null;

const NavRow = ({
  item,
  depth,
  collapsed,
  onNavigate,
}: {
  item: HiringNavItem;
  depth: number;
  collapsed: boolean;
  onNavigate: () => void;
}) => {
  const hasChildren = !!item.children?.length;
  const childActive = !!item.children?.some((c) => c.active);
  const [open, setOpen] = useState(item.active || childActive);
  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  if (collapsed && depth > 0) return null;

  return (
    <>
      <div className="relative flex items-center">
        <button
          type="button"
          onClick={() => {
            item.onClick();
            if (hasChildren) setOpen(true);
            onNavigate();
          }}
          title={collapsed ? item.label : undefined}
          aria-current={item.active ? 'page' : undefined}
          className={cn(
            'group flex min-w-0 flex-1 items-center gap-2.5 rounded-lg text-[13px] transition-colors',
            depth === 0 ? 'h-9 px-2.5' : 'h-8 pl-9 pr-2.5',
            collapsed && 'h-10 justify-center px-0',
            item.active
              ? 'bg-white/[0.09] font-medium text-white'
              : 'text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-100',
            item.dim && !item.active && 'text-neutral-600',
          )}
        >
          {item.dot ? (
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: item.dot }}
            />
          ) : item.icon ? (
            <Icon
              name={item.icon}
              filled={item.active}
              className={cn(
                'shrink-0',
                depth === 0 ? 'text-[19px]' : 'text-[16px]',
              )}
            />
          ) : null}
          {!collapsed && <span className="truncate">{item.label}</span>}
          {!collapsed && (
            <CountBadge
              count={item.count}
              tone={item.countTone}
              active={item.active}
            />
          )}
          {/* Room for the fold button. */}
          {!collapsed && hasChildren && <span className="w-5 shrink-0" />}
        </button>
        {!collapsed && hasChildren && (
          <button
            type="button"
            aria-label={open ? `Fold ${item.label}` : `Unfold ${item.label}`}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="absolute right-1 flex size-6 items-center justify-center rounded-md text-neutral-500 hover:bg-white/10 hover:text-neutral-200"
          >
            <Icon
              name="chevron_right"
              className={cn(
                'text-[16px] transition-transform',
                open && 'rotate-90',
              )}
            />
          </button>
        )}
      </div>
      {!collapsed && hasChildren && open && (
        <div className="relative flex flex-col gap-0.5 before:absolute before:inset-y-1 before:left-[19px] before:w-px before:bg-white/[0.07]">
          {item.children!.map((child) => (
            <NavRow
              key={child.id}
              item={child}
              depth={depth + 1}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </>
  );
};

/**
 * The Hiring space: one sidebar (company, then groups of pages with nested
 * items such as each opening), a slim header and the page.
 */
export const HiringLayout = ({
  companies,
  companyId,
  onSelectCompany,
  groups,
  title,
  subtitle,
  actions,
  footer,
  children,
}: {
  companies: WorkspaceCompany[];
  companyId: string | null;
  onSelectCompany: (companyId: string) => void;
  groups: HiringNavGroup[];
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Links at the bottom of the sidebar (back to the portal…). */
  footer: Array<{ icon: string; label: string; onClick: () => void }>;
  children: ReactNode;
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [folded, setFolded] = useState<string[]>([]);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === 'true');
    } catch {
      /* storage unavailable */
    }
    setFolded(readFolded());
  }, []);

  const toggleCollapsed = () =>
    setCollapsed((v) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, String(!v));
      } catch {
        /* storage unavailable */
      }
      return !v;
    });

  const toggleGroup = (id: string) =>
    setFolded((current) => {
      const next = current.includes(id)
        ? current.filter((g) => g !== id)
        : [...current, id];
      try {
        localStorage.setItem(FOLDED_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });

  const sidebar = (isCollapsed: boolean) => (
    <>
      <div
        className={cn(
          'flex shrink-0 flex-col gap-3 px-3 pb-3 pt-4',
          isCollapsed && 'items-center px-2',
        )}
      >
        <div
          className={cn(
            'flex items-center gap-2.5 px-1',
            isCollapsed && 'justify-center px-0',
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/portal-logo.svg"
            alt="Portal"
            className="size-7 shrink-0 object-contain"
          />
          {!isCollapsed && (
            <p className="text-sm font-semibold tracking-tight text-white">
              Hiring
            </p>
          )}
        </div>
        <CompanySwitcher
          companies={companies}
          value={companyId}
          onChange={onSelectCompany}
          collapsed={isCollapsed}
        />
      </div>

      <nav
        className={cn(
          'custom-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4',
          isCollapsed && 'px-2',
        )}
      >
        {groups.map((group) => {
          const isFolded = folded.includes(group.id) && !isCollapsed;
          return (
            <div key={group.id} className="flex flex-col gap-0.5">
              {isCollapsed ? (
                <span className="mx-auto my-1 h-px w-6 bg-white/[0.07]" />
              ) : (
                <div className="group/head flex h-7 items-center gap-1 pl-2.5 pr-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={!isFolded}
                    className="flex min-w-0 flex-1 items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-300"
                  >
                    <span className="truncate">{group.label}</span>
                    <Icon
                      name="expand_more"
                      className={cn(
                        'text-[14px] opacity-0 transition group-hover/head:opacity-100',
                        isFolded && '-rotate-90 opacity-100',
                      )}
                    />
                  </button>
                  {group.action && (
                    <button
                      type="button"
                      title={group.action.label}
                      aria-label={group.action.label}
                      onClick={group.action.onClick}
                      className="flex size-6 items-center justify-center rounded-md text-neutral-500 hover:bg-white/10 hover:text-white"
                    >
                      <Icon name={group.action.icon} className="text-[16px]" />
                    </button>
                  )}
                </div>
              )}
              {!isFolded && (
                <GroupItems
                  group={group}
                  collapsed={isCollapsed}
                  onNavigate={() => setMobileOpen(false)}
                />
              )}
              {!isFolded &&
                !isCollapsed &&
                !group.items.length &&
                group.empty && (
                  <p className="px-2.5 py-1 text-xs text-neutral-600">
                    {group.empty}
                  </p>
                )}
            </div>
          );
        })}
      </nav>

      <div
        className={cn(
          'flex shrink-0 flex-col gap-0.5 border-t border-white/[0.07] p-3',
          isCollapsed && 'px-2',
        )}
      >
        {footer.map((link) => (
          <button
            key={link.label}
            type="button"
            onClick={link.onClick}
            title={isCollapsed ? link.label : undefined}
            className={cn(
              'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-neutral-400 transition-colors hover:bg-white/[0.05] hover:text-neutral-100',
              isCollapsed && 'justify-center px-0',
            )}
          >
            <Icon name={link.icon} className="text-[19px]" />
            {!isCollapsed && link.label}
          </button>
        ))}
        <button
          type="button"
          onClick={toggleCollapsed}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'hidden h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-neutral-500 transition-colors hover:bg-white/[0.05] hover:text-neutral-100 lg:flex',
            isCollapsed && 'justify-center px-0',
          )}
        >
          <Icon
            name={isCollapsed ? 'right_panel_close' : 'left_panel_close'}
            className="text-[19px]"
          />
          {!isCollapsed && 'Collapse'}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-neutral-950 text-neutral-100">
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-white/[0.07] bg-neutral-950 transition-[width] duration-200 lg:flex',
          collapsed ? 'w-[68px]' : 'w-[260px]',
        )}
      >
        {sidebar(collapsed)}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col border-r border-white/[0.07] bg-neutral-950 shadow-2xl">
            {sidebar(false)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-white/[0.07] px-4 py-2 sm:px-6">
          <IconAction
            icon="menu"
            label="Open navigation"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">
              {title}
            </div>
            {subtitle && (
              <div className="hidden truncate text-xs text-neutral-500 sm:block">
                {subtitle}
              </div>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-1">{actions}</div>
          )}
        </header>
        <main className="custom-scrollbar flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
