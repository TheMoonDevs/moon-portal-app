'use client';

import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { useUser } from '@/utils/hooks/useUser';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { UserAvatar } from '../Admin/shared/AdminUI';
import { CompanyMark } from '../Admin/Workspace/shared';

interface Row {
  rank: number;
  user: { id: string; name?: string | null; avatar?: string | null };
  points: number;
  tasksDone: number;
  worklogDays: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

/** This month's leaderboard for one of the user's companies. */
export const LeaderboardSection = () => {
  const { user } = useUser();
  const { companies } = useWorkspace();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (companyId && companies.some((c) => c.company.id === companyId)) return;
    setCompanyId(companies[0]?.company.id ?? null);
  }, [companies, companyId]);

  useEffect(() => {
    if (!companyId) return;
    setRows(null);
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

      {companies.length > 1 && (
        <div className="mx-4 mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {companies.map(({ company }) => (
            <button
              key={company.id}
              onClick={() => setCompanyId(company.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-xs font-medium transition-colors',
                company.id === companyId
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
              )}
            >
              <CompanyMark
                name={company.name}
                color={company.color}
                logo={company.logo}
                size={20}
              />
              {company.name}
            </button>
          ))}
        </div>
      )}

      <div className="m-4 mt-3 overflow-hidden rounded-xl bg-white shadow-md">
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
          <ol className="divide-y divide-neutral-100">
            {rows.slice(0, 10).map((row) => (
              <li
                key={row.user.id}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5',
                  row.user.id === user?.id && 'bg-amber-50',
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
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};
