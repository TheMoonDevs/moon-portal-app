'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { WorkspaceCompany } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { CompanyMark } from '../Admin/Workspace/shared';

/** Most tabs shown before the rest go in the "+N" menu. */
const MAX_TABS = 8;
/** Room kept for the "+N" button when some tabs don't fit. */
const MORE_WIDTH = 56;
/** The menu button's arrow, beside a picked company's name. */
const MENU_ARROW = 20;
/** Gap between tabs (gap-1). */
const GAP = 4;

type MyPoints = {
  /** Per company id. */
  points: Record<string, number>;
  /** Per project id. */
  projects: Record<string, number>;
};

let pointsRequest: Promise<MyPoints> | null = null;

/**
 * The signed-in user's recent points in each of their companies and
 * projects, fetched once per page load and shared by the home page's
 * sections.
 */
export const useMyPoints = () => {
  const [points, setPoints] = useState<MyPoints | null>(null);
  useEffect(() => {
    pointsRequest ??= PortalSdk.getData('/api/leaderboard/mine', null)
      .then(
        (res): MyPoints => ({
          points: res?.data?.points ?? {},
          projects: res?.data?.projects ?? {},
        }),
      )
      .catch(() => {
        pointsRequest = null;
        return { points: {}, projects: {} };
      });
    let live = true;
    pointsRequest.then((p) => live && setPoints(p));
    return () => {
      live = false;
    };
  }, []);
  return points;
};

const Mark = ({ company }: { company: WorkspaceCompany['company'] }) => (
  <CompanyMark
    name={company.name}
    color={company.color}
    logo={company.logo}
    size={18}
  />
);

const tabClass = (active: boolean) =>
  cn(
    '-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 pb-2 pt-1 text-xs font-semibold transition-colors',
    active
      ? 'border-neutral-900 text-neutral-900'
      : 'border-transparent text-neutral-500 hover:text-neutral-800',
  );

/**
 * A row of company tabs: the picked company shows its logo and name, the
 * others only their logo (the name is on hover). As many as fit the width
 * are shown, then a "+N" menu for the rest. A company picked from the menu
 * shows on the menu button. The row never scrolls.
 */
export const CompanyTabs = ({
  companies,
  selectedId,
  onSelect,
}: {
  companies: WorkspaceCompany[];
  selectedId: string | null;
  onSelect: (companyId: string) => void;
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(Math.min(MAX_TABS, companies.length));

  useLayoutEffect(() => {
    const row = rowRef.current;
    const measure = measureRef.current;
    if (!row || !measure) return;
    const update = () => {
      const els = Array.from(measure.children) as HTMLElement[];
      // The last child is a logo-only tab; the rest are full tabs.
      const logoOnly = els[els.length - 1]?.offsetWidth ?? 0;
      const full = els.slice(0, -1).map((el) => el.offsetWidth);
      const room = row.clientWidth;
      const cap = Math.min(MAX_TABS, companies.length);
      const picked = companies.findIndex((c) => c.company.id === selectedId);
      let n = 0;
      let used = 0;
      for (; n < cap; n++) {
        const width = n === picked ? full[n] : logoOnly;
        const next = used + (n ? GAP : 0) + width;
        const restLeft = n + 1 < companies.length;
        // A company picked from the menu shows its name on the menu button.
        const moreWidth =
          picked > n
            ? Math.max(MORE_WIDTH, full[picked] + MENU_ARROW)
            : MORE_WIDTH;
        if (next + (restLeft ? GAP + moreWidth : 0) > room) break;
        used = next;
      }
      setFit(Math.max(1, n));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(row);
    return () => ro.disconnect();
  }, [companies, selectedId]);

  const visible = companies.slice(0, fit);
  const more = companies.slice(fit);
  const pickedFromMore = more.find((c) => c.company.id === selectedId);

  return (
    <div
      ref={rowRef}
      className="relative m-4 mb-0 mt-3 flex min-w-0 items-end gap-1 border-b border-neutral-200"
    >
      {/* Every tab at full width, unseen, to work out how many fit. */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 flex gap-1"
      >
        {companies.map(({ company }) => (
          <span key={company.id} className={tabClass(false)}>
            <Mark company={company} />
            {company.name}
          </span>
        ))}
        {companies[0] && (
          <span className={tabClass(false)}>
            <Mark company={companies[0].company} />
          </span>
        )}
      </div>
      {visible.map(({ company }) => {
        const active = company.id === selectedId;
        return (
          <button
            key={company.id}
            onClick={() => onSelect(company.id)}
            title={company.name}
            aria-label={company.name}
            aria-pressed={active}
            className={cn(tabClass(active), active && 'min-w-0 shrink')}
          >
            <Mark company={company} />
            {active && <span className="truncate">{company.name}</span>}
          </button>
        );
      })}
      {more.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              title={`${more.length} more`}
              className={cn(tabClass(!!pickedFromMore), 'min-w-0 shrink')}
            >
              {pickedFromMore ? (
                <>
                  <Mark company={pickedFromMore.company} />
                  <span className="truncate">
                    {pickedFromMore.company.name}
                  </span>
                </>
              ) : (
                `+${more.length}`
              )}
              <span className="material-symbols-outlined -mr-1 !text-base !leading-4">
                expand_more
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="quiet-scrollbar max-h-72 overflow-y-auto"
          >
            {more.map(({ company }) => (
              <DropdownMenuItem
                key={company.id}
                onSelect={() => onSelect(company.id)}
                className={cn(
                  'gap-2 text-xs',
                  company.id === selectedId && 'font-semibold',
                )}
              >
                <Mark company={company} />
                {company.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
