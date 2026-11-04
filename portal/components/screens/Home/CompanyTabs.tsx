'use client';

import { useEffect, useState } from 'react';

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

/** Tabs shown before the rest go in the "+N" menu. */
const VISIBLE_TABS = 3;

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
 * A row of company tabs: the first three, then a "+N" menu for the rest.
 * A company picked from the menu shows on the menu button.
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
  const visible = companies.slice(0, VISIBLE_TABS);
  const more = companies.slice(VISIBLE_TABS);
  const pickedFromMore = more.find((c) => c.company.id === selectedId);

  return (
    <div className="m-4 mb-0 mt-3 flex items-end gap-1 border-b border-neutral-200">
      <div className="flex min-w-0 gap-1 overflow-x-auto">
        {visible.map(({ company }) => (
          <button
            key={company.id}
            onClick={() => onSelect(company.id)}
            className={tabClass(company.id === selectedId)}
          >
            <Mark company={company} />
            {company.name}
          </button>
        ))}
      </div>
      {more.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              title={`${more.length} more`}
              className={tabClass(!!pickedFromMore)}
            >
              {pickedFromMore ? (
                <>
                  <Mark company={pickedFromMore.company} />
                  {pickedFromMore.company.name}
                </>
              ) : (
                `+${more.length}`
              )}
              <span className="material-symbols-outlined -mr-1 !text-base">
                expand_more
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
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
