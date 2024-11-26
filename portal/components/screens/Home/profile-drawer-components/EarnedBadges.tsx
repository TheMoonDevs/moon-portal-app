'use client';
import { Spinner } from '@/components/elements/Loaders';
import ToolTip from '@/components/elements/ToolTip';
import { RootState, useAppSelector } from '@/utils/redux/store';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { Skeleton } from '@mui/material';
import { BadgeRewarded } from '@prisma/client';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';

const EarnedBadges = () => {
  const [badgeRewarded, setBadgeRewarded] = useState<BadgeRewarded[]>();
  const [loading, setLoading] = useState<boolean>(true);
  const selectedUser = useAppSelector(
    (state: RootState) => state.coreTeam.selectedMember,
  );

  useEffect(() => {
    const fetchBadgesRewarded = async () => {
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

  return (
    <div className="pb-3">
      <h6 className="pb-2 font-bold">Achievements</h6>
      <div className="flex justify-center">
        {loading ? (
          <div className="flex items-center justify-center">
            <BadgeLoader />
          </div>
        ) : (badgeRewarded?.length ?? 0 > 0) ? (
          <div className="flex w-full justify-center">
            <div className="mx-auto flex w-full flex-row flex-wrap items-center justify-center gap-2 max-sm:justify-between">
              {badgeRewarded?.map((badge: BadgeRewarded) => (
                <div
                  className="flex w-24 flex-col items-center justify-center gap-1 max-sm:w-20"
                  key={badge.id}
                >
                  <div className="hover:before:animate-shine focus:before:animate-shine relative h-full w-24 overflow-hidden rounded-full before:absolute before:left-[-75%] before:top-0 before:z-[2] before:h-full before:w-1/4 before:skew-x-[-25deg] before:transform before:bg-[linear-gradient(to_right,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0.4)_100%)] before:content-[''] max-sm:w-20">
                    <img
                      key={badge.id}
                      src={badge.imageUrl || ''}
                      alt={badge.name}
                      className="h-24 w-24 rounded-full border-4 border-gray-300 object-cover shadow-lg max-sm:h-20 max-sm:w-20"
                    />
                  </div>
                  <p className="px-1 text-center text-[11px] font-semibold capitalize max-sm:text-[9px]">
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
