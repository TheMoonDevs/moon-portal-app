'use client';

import { cn } from '@/lib/utils';
import { useWorkspace } from '@/utils/hooks/useWorkspace';

import { CompanyMark } from '../Admin/Workspace/shared';

/** Small chips with the icon and name of every company the user is in. */
export const CompanyChips = ({ className }: { className?: string }) => {
  const { companies } = useWorkspace();
  if (!companies.length) return null;
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {companies.map(({ company }) => (
        <span
          key={company.id}
          title={company.name}
          className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 py-0.5 pl-0.5 pr-2.5 text-xs font-medium text-neutral-700"
        >
          <CompanyMark
            name={company.name}
            color={company.color}
            logo={company.logo}
            size={20}
          />
          <span className="max-w-[140px] truncate">{company.name}</span>
        </span>
      ))}
    </div>
  );
};

const roleLabel = (keys?: string[] | null) =>
  (keys ?? []).map((k) => k.charAt(0).toUpperCase() + k.slice(1)).join(', ');

/** The companies the user belongs to, with their role in each. */
export const CompaniesSection = () => {
  const { companies, loading } = useWorkspace();

  return (
    <div>
      <h4 className="px-4 text-lg font-bold">Your companies</h4>
      <div className="m-4 mt-3 flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-xl bg-white shadow-md">
        {loading && !companies.length ? (
          <div className="h-16 animate-pulse bg-neutral-50" />
        ) : companies.length === 0 ? (
          <p className="p-4 text-sm text-neutral-500">
            You are not in a company yet. Ask an admin to add you.
          </p>
        ) : (
          companies.map(({ company, member }) => (
            <div key={company.id} className="flex items-center gap-3 p-3">
              <CompanyMark
                name={company.name}
                color={company.color}
                logo={company.logo}
                size={40}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-neutral-900">
                  {company.name}
                </p>
                <p className="truncate text-xs text-neutral-500">
                  {member ? roleLabel(member.roleKeys) : 'Visible to you'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
