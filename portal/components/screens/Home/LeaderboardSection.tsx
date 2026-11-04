'use client';

import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { useUser } from '@/utils/hooks/useUser';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { UserAvatar } from '../Admin/shared/AdminUI';
import { CompanyTabs, useCompaniesByMyPoints } from './CompanyTabs';
import type { LeaderboardPerson as Row } from './PersonWorklogsDrawer';
import { PersonWorklogsDrawer } from './PersonWorklogsDrawer';

const MEDALS = ['🥇', '🥈', '🥉'];

/** This month's leaderboard for one of the user's companies. */
export const LeaderboardSection = () => {
  const { user } = useUser();
  const { companies: allCompanies } = useWorkspace();
  // The companies the user earns the most points in come first.
  const companies = useCompaniesByMyPoints(allCompanies);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (companyId && companies.some((c) => c.company.id === companyId)) return;
    setCompanyId(companies[0]?.company.id ?? null);
  }, [companies, companyId]);

  useEffect(() => {
    if (!companyId) return;
    setRows(null);
    setOpenIndex(null);
    PortalSdk.getData(`/api/leaderboard?companyId=${companyId}`, null)
      .then((res) => setRows(res?.data?.rows ?? []))
      .catch(() => setRows([]));
  }, [companyId]);

  if (!companies.length) return null;

  return (
    <div>
      <h4 className="px-4 text-lg font-bold">
        Leaderboard
        <span className="ml-2 text-xs font-normal text-neutral-500">
          {dayjs().format('MMMM')}
        </span>
      </h4>

      <CompanyTabs
        companies={companies}
        selectedId={companyId}
        onSelect={setCompanyId}
      />

      <div className="m-4 mt-0 overflow-hidden rounded-b-xl bg-white shadow-md">
        {!rows ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-neutral-50"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="p-4 text-sm text-neutral-500">No one here yet.</p>
        ) : (
          <ol className="max-h-[70vh] divide-y divide-neutral-100 overflow-y-auto">
            {rows.map((row, i) => (
              <li key={row.user.id}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(i)}
                  title={`See ${row.user.name ?? 'their'}'s worklogs`}
                  className={cn(
                    'group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-neutral-50',
                    row.user.id === user?.id &&
                      'bg-amber-50 hover:bg-amber-100',
                    openIndex === i && 'bg-neutral-100',
                  )}
                >
                  <span className="w-6 text-center text-sm font-semibold text-neutral-500">
                    {MEDALS[row.rank - 1] ?? row.rank}
                  </span>
                  <UserAvatar
                    src={row.user.avatar}
                    name={row.user.name}
                    size={32}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-neutral-900">
                      {row.user.name}
                    </span>
                    <span className="block text-xs text-neutral-500">
                      {row.worklogDays} days logged · {row.tasksDone} tasks done
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-bold text-neutral-900">
                      {row.points}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wider text-neutral-400">
                      pts
                    </span>
                  </span>
                  <span className="material-symbols-outlined -mr-1 !text-lg text-neutral-300 transition-colors group-hover:text-neutral-600">
                    chevron_right
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <PersonWorklogsDrawer
        people={rows ?? []}
        index={openIndex}
        onIndexChange={setOpenIndex}
        onClose={() => setOpenIndex(null)}
        isMe={(id) => id === user?.id}
      />
    </div>
  );
};
