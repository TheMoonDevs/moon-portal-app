import type { BadgeRewarded, BadgeTemplate } from '@db/client';
import type { JsonObject } from '@db/runtime';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';

import DrawerComponent from '@/components/elements/DrawerComponent';
import { Spinner } from '@/components/elements/Loaders';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import BadgeCard from './BadgeCard';

const TILE_CLASS =
  'relative flex size-[5em] flex-col items-center justify-center gap-1 rounded-[1.15em] bg-white text-neutral-900';

const Tile = ({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
}) => (
  <button type="button" onClick={onClick} className={TILE_CLASS}>
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-2xl">
      <span className="icon_size material-symbols-outlined font-light">
        {icon}
      </span>
      <span className="text-[0.4em] leading-none tracking-[0.2em]">
        {label}
      </span>
    </div>
  </button>
);

// Time-based badges unlock purely from the joining date, so the client resolves
// them on load and tells the server which ones are now earned.
const targetDateFor = (criteriaLogic: string, joining: dayjs.Dayjs) => {
  const [rawAmount, unit] = criteriaLogic.split(' ');
  const amount = parseInt(rawAmount, 10);
  if (Number.isNaN(amount)) return null;
  if (unit?.includes('day')) return joining.add(amount, 'day');
  if (unit?.includes('month')) return joining.add(amount, 'month');
  if (unit?.includes('year')) return joining.add(amount, 'year');
  return null;
};

export const ButtonBoard = ({
  setCoreTeamDrawerOpen,
}: {
  isCoreTeamDrawerOpen: boolean;
  setCoreTeamDrawerOpen: (value: boolean) => void;
}) => {
  const { user } = useUser();
  const [isBadgeDrawerOpen, setBadgeDrawerOpen] = useState(false);
  const [badgesRewarded, setBadgesRewarded] = useState<BadgeRewarded[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    PortalSdk.getData(`/api/user/badge-rewarded?id=${user.id}`, null)
      .then((res) => setBadgesRewarded(res?.data ?? []))
      .catch((error) => console.error('Error fetching badges:', error))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const claimTimeBasedBadges = useCallback(async () => {
    const joining = dayjs((user?.workData as any)?.joining);
    if (!user?.id || !joining.isValid()) return;

    const res = await PortalSdk.getData(
      '/api/badges?badgeType=TIME_BASED',
      null,
    );
    const badges: BadgeTemplate[] = res?.data ?? [];

    await Promise.all(
      badges.map((badge) => {
        const criteriaLogic = (badge.criteria as JsonObject)
          ?.criteriaLogic as string;
        if (!criteriaLogic) return null;

        const targetDate = targetDateFor(criteriaLogic, joining);
        if (!targetDate) return null;

        const earned = !dayjs().isBefore(targetDate, 'day');
        return PortalSdk.postData('/api/user/badge-rewarded', {
          userId: user.id,
          badgeTemplateId: badge.id,
          name: badge.name,
          sequence: 'voyagers',
          imageUrl: badge.imageurl,
          status: earned ? 'REWARDED' : 'ACTIVATED',
          showsCounter: !earned,
          date: targetDate.format('YYYY-MM-DD'),
        });
      }),
    );
  }, [user?.id, user?.workData]);

  useEffect(() => {
    claimTimeBasedBadges().catch((error) =>
      console.error('Error claiming badges:', error),
    );
  }, [claimTimeBasedBadges]);

  return (
    <div className="flex w-full select-none flex-row justify-between px-3 py-2">
      <Tile
        icon="groups"
        label="TEAMS"
        onClick={() => setCoreTeamDrawerOpen(true)}
      />
      <Tile icon="rocket_launch" label="GOALS" />
      <Tile
        icon="editor_choice"
        label="BADGES"
        onClick={() => setBadgeDrawerOpen(true)}
      />
      <Tile icon="monitoring" label="EARN" />
      <DrawerComponent
        isOpen={isBadgeDrawerOpen}
        handleClose={() => setBadgeDrawerOpen(false)}
      >
        <div className="p-4">
          <h2 className="mb-6 text-center text-xl font-bold">
            Your Earned Badges
          </h2>
          {loading ? (
            <div className="flex h-screen items-center justify-center">
              <Spinner className="size-10" />
            </div>
          ) : badgesRewarded.length > 0 ? (
            <div className="flex flex-col gap-4">
              {badgesRewarded.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </div>
          ) : (
            <div className="flex h-screen items-center justify-center">
              No badges found.
            </div>
          )}
        </div>
      </DrawerComponent>
    </div>
  );
};
