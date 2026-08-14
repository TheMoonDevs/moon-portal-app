'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { APP_ROUTES } from '@/utils/constants/appInfo';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  CardSkeletons,
  EmptyState,
  formatDate,
  Icon,
  Panel,
  Pill,
  SearchInput,
  StatCard,
} from '../shared/AdminUI';

interface Criteria {
  criteriaLogic?: string;
  streakType?: string;
  streakTitle?: string;
  streakCount?: number;
  customTitle?: string;
  customDescription?: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  imageurl: string;
  criteria: Criteria;
  createdAt: string;
  updatedAt: string;
}

const criteriaSummary = (criteria?: Criteria) => {
  if (!criteria) return null;
  if (criteria.streakType && criteria.streakCount) {
    return `${criteria.streakCount}× ${criteria.streakType.replace(/_/g, ' ')}`;
  }
  return criteria.customTitle || criteria.streakTitle || null;
};

const AdminBadges = () => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchBadges = async () => {
      setLoading(true);
      try {
        const response = await PortalSdk.getData('/api/badges', null);
        setBadges(response?.data || []);
      } catch (error) {
        console.error('Error fetching badges:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBadges();
  }, []);

  const visibleBadges = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return badges;
    return badges.filter((badge) =>
      [badge.name, badge.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [badges, search]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Badge templates"
          value={badges.length}
          icon="workspace_premium"
          tone="warning"
          loading={loading}
        />
        <StatCard
          label="With criteria"
          value={
            badges.filter((badge) => criteriaSummary(badge.criteria)).length
          }
          icon="rule"
          tone="info"
          hint="Badges that unlock automatically"
          loading={loading}
        />
      </div>

      <Panel>
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] p-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search badges…"
            className="min-w-[220px] flex-1"
          />
          <Link href={APP_ROUTES.badgeEditor}>
            <AdminButton tone="primary" icon="add">
              New badge
            </AdminButton>
          </Link>
        </div>

        {loading ? (
          <div className="p-4">
            <CardSkeletons count={6} />
          </div>
        ) : visibleBadges.length === 0 ? (
          <EmptyState
            icon={search ? 'search_off' : 'workspace_premium'}
            title={search ? 'No badges match your search' : 'No badges yet'}
            description={
              search
                ? 'Try a different badge name or description.'
                : 'Create a badge template members can unlock.'
            }
            action={
              !search ? (
                <Link href={APP_ROUTES.badgeEditor}>
                  <AdminButton size="sm" tone="primary" icon="add">
                    New badge
                  </AdminButton>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleBadges.map((badge) => {
              const summary = criteriaSummary(badge.criteria);
              return (
                <Link
                  key={badge.id}
                  href={`${APP_ROUTES.badgeEditor}?id=${badge.id}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02] transition-colors hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <div className="relative aspect-[5/2] w-full overflow-hidden bg-neutral-900">
                    {badge.imageurl ? (
                      <img
                        src={badge.imageurl}
                        alt={badge.name}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-[28px] text-neutral-700">
                        <Icon name="workspace_premium" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-neutral-100">
                        {badge.name}
                      </h3>
                      <Icon
                        name="edit"
                        className="shrink-0 text-[16px] text-neutral-600 transition-colors group-hover:text-neutral-300"
                      />
                    </div>
                    <p className="line-clamp-2 text-xs text-neutral-500">
                      {badge.description}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                      {summary && <Pill tone="warning">{summary}</Pill>}
                      <span className="text-[11px] text-neutral-600">
                        Updated {formatDate(badge.updatedAt)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
};

export default AdminBadges;
