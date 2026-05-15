'use client';
import type { BadgeRewarded } from '@db/client';
import { Skeleton } from '@mui/material';
import React, { useEffect, useState } from 'react';

import type { RootState } from '@/utils/redux/store';
import { useAppSelector } from '@/utils/redux/store';
import { PortalSdk } from '@/utils/services/PortalSdk';

const EarnedBadges = ({ logBadges }: { logBadges: any[] }) => {
  const [badgeRewarded, setBadgeRewarded] = useState<BadgeRewarded[]>();
  const [loading, setLoading] = useState<boolean>(true);
  const selectedUser = useAppSelector(
    (state: RootState) => state.coreTeam.selectedMember,
  );

  useEffect(() => {
    const fetchBadgesRewarded = async () => {
      console.log('log Buff Badges', logBadges?.length);
      try {
        const res = await PortalSdk.getData(
          `/api/user/badge-rewarded?id=${selectedUser?.id}`,
          null,
        );
        const data = await res.data;
        setBadgeRewarded(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching badges:', error);
        setLoading(false);
      }
    };

    fetchBadgesRewarded();
  }, [selectedUser?.id]);

  if (loading) return null;

  if (badgeRewarded && badgeRewarded.length == 0) return null;
  return (
    <div className="pb-3">
      <h6 className="pb-4 text-xs font-bold uppercase tracking-[1em]">
        Achievements
      </h6>
      <div className="flex justify-center">
        {loading ? (
          <div className="flex items-center justify-center">
            <BadgeLoader />
          </div>
        ) : badgeRewarded && badgeRewarded?.length > 0 ? (
          <div className="flex w-full justify-center">
            <div className="mx-auto flex w-full flex-row items-start justify-start gap-2 overflow-x-auto md:gap-3">
              {badgeRewarded?.map((badge: BadgeRewarded) => (
                <div
                  className="flex w-20 flex-col items-center justify-center"
                  key={badge.id}
                >
                  <div className="relative flex items-center justify-center overflow-hidden rounded-full before:absolute before:-left-3/4 before:top-0 before:z-[2] before:h-full before:w-1/4 before:skew-x-[-25deg] before:bg-[linear-gradient(to_right,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0.4)_100%)] before:content-[''] hover:before:animate-shine focus:before:animate-shine">
                    <img
                      key={badge.id}
                      src={badge.imageUrl || ''}
                      alt={badge.name}
                      className="size-14 min-h-14 min-w-14 rounded-full object-cover"
                    />
                  </div>
                  <p className="line-clamp-2 self-center px-1 pt-1 text-center text-[11px] font-semibold capitalize max-sm:text-[9px]">
                    {badge.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            No badges found.
          </div>
        )}
      </div>
    </div>
  );
};

export default EarnedBadges;

export const BadgeLoader = () => {
  return (
    <div className="flex h-24 flex-row items-center justify-center gap-2">
      <Skeleton
        variant="rectangular"
        width={16}
        height={16}
        className="rounded-full"
        animation="pulse"
      />
      <Skeleton
        variant="rectangular"
        width={16}
        height={16}
        className="rounded-full"
        animation="pulse"
      />
      <Skeleton
        variant="rectangular"
        width={16}
        height={16}
        className="rounded-full"
        animation="pulse"
      />
    </div>
  );
};
