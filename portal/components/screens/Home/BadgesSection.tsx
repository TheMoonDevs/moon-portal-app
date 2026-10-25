'use client';

import { useEffect, useMemo, useState } from 'react';

import { PortalSdk } from '@/utils/services/PortalSdk';

import type { BadgeProgress } from './BadgeCard';
import BadgeCard from './BadgeCard';

const PREVIEW = 3;

/** The user's badges: earned first, then the ones they are closest to. */
export const BadgesSection = () => {
  const [items, setItems] = useState<BadgeProgress[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    PortalSdk.getData('/api/me/badges', null)
      .then((res) => setItems(res?.data?.badges ?? []))
      .catch(() => setItems([]));
  }, []);

  const sorted = useMemo(
    () =>
      [...(items ?? [])].sort((a, b) => {
        if (!!a.earnedAt !== !!b.earnedAt) return a.earnedAt ? -1 : 1;
        const pa = a.value / Math.max(a.badge.threshold, 1);
        const pb = b.value / Math.max(b.badge.threshold, 1);
        return pb - pa;
      }),
    [items],
  );

  if (items && items.length === 0) return null;
  const earned = sorted.filter((b) => b.earnedAt).length;
  const visible = showAll ? sorted : sorted.slice(0, PREVIEW);

  return (
    <div>
      <h4 className="flex items-baseline justify-between px-4 text-lg font-bold">
        <span>
          Badges
          {items && (
            <span className="ml-2 text-xs font-normal text-neutral-500">
              {earned} of {items.length} earned
            </span>
          )}
        </span>
        {sorted.length > PREVIEW && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-xs font-semibold text-neutral-500 hover:text-neutral-900"
          >
            {showAll ? 'Show less' : 'See all'}
          </button>
        )}
      </h4>
      <div className="m-4 mt-3 flex flex-col gap-3">
        {!items
          ? [0, 1].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-lg bg-neutral-100"
              />
            ))
          : visible.map((item) => <BadgeCard key={item.badge.id} {...item} />)}
      </div>
    </div>
  );
};
