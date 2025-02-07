import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { BadgeRewarded, BadgeTemplate } from '@prisma/client';
import { JsonObject } from '@prisma/client/runtime/library';
import DrawerComponent from '@/components/elements/DrawerComponent';
import BadgeCard from './BadgeCard';
import { Spinner } from '@/components/elements/Loaders';

export const ButtonBoard = ({
  isCoreTeamDrawerOpen,
  setCoreTeamDrawerOpen,
}: {
  isCoreTeamDrawerOpen: boolean;
  setCoreTeamDrawerOpen: (value: boolean) => void;
}) => {
  const [badges, setBadges] = useState<BadgeTemplate[]>();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [badgeRewarded, setBadgeRewarded] = useState<BadgeRewarded[]>();
  const [loading, setLoading] = useState<boolean>(false);
  const { user } = useUser();

  const handleClose = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const res = await PortalSdk.getData(
          '/api/badges?badgeType=TIME_BASED',
          null,
        );
        setBadges(res.data);
      } catch (error) {
        console.error('Error fetching badges:', error);
      }
    };

    fetchBadges();
  }, []);

  useEffect(() => {
    const fetchBadgesRewarded = async () => {
      setLoading(true);

      try {
        const res = await PortalSdk.getData(
          `/api/user/badge-rewarded?id=${user?.id}`,
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
  }, [user?.id]);

  const sendBadgeRequest = async (
    status: string,
    showsCounter: boolean,
    badge: BadgeTemplate,
    date?: string,
  ) => {
    const badgePayload = {
      userId: user?.id,
      badgeTemplateId: badge.id,
      name: badge.name,
      sequence: 'voyagers',
      imageUrl: badge.imageurl,
      status,
      showsCounter,
      ...(date && { date }),
    };

    try {
      const res = await PortalSdk.postData(
        '/api/user/badge-rewarded',
        badgePayload,
      );
      // console.log(`Badge ${status.toLowerCase()} successfully:`, res.data);
    } catch (error) {
      console.error(`Error ${status.toLowerCase()} badge:`, error);
    }
  };

  const checkAndRewardBadge = async ({ badge }: { badge: BadgeTemplate }) => {
    const { criteria } = badge;
    const criteriaLogic = (criteria as JsonObject)?.criteriaLogic as string;
    const joiningDate = dayjs((user?.workData as any)?.joining);
    if (!criteria || !criteriaLogic || !joiningDate.isValid()) {
      return;
    }

    const today = dayjs();
    let targetDate;

    if (criteriaLogic.includes('days')) {
      const days = parseInt(criteriaLogic.split(' ')[0], 10);
      targetDate = joiningDate.add(days, 'day');
    } else if (criteriaLogic.includes('months')) {
      const months = parseInt(criteriaLogic.split(' ')[0], 10);
      targetDate = joiningDate.add(months, 'month');
    } else if (criteriaLogic.includes('year')) {
      const years = parseInt(criteriaLogic.split(' ')[0], 10);
      targetDate = joiningDate.add(years, 'year');
    }
    const formattedTargetDate = targetDate?.format('YYYY-MM-DD');

    if (
      targetDate &&
      (today.isAfter(targetDate) || today.isSame(targetDate, 'day'))
    ) {
      await sendBadgeRequest('REWARDED', false, badge, formattedTargetDate);
    } else {
      await sendBadgeRequest('ACTIVATED', true, badge, formattedTargetDate);
    }
  };

  useEffect(() => {
    if (badges) {
      badges?.forEach((badge: BadgeTemplate) => {
        checkAndRewardBadge({ badge });
      });
    }
  }, [badges]);

  return (
    <div className="flex w-full select-none flex-row justify-between px-3 py-2">
      <Link
        onClick={() => setCoreTeamDrawerOpen(true)}
        href=""
        className="relative flex h-[5em] w-[5em] flex-col items-center justify-center gap-1 rounded-[1.15em] bg-white text-neutral-900"
      >
        {/* <Image
          width={100}
          height={500}
          src={"/images/lexica/zeros_sun.jpg"}
          alt={""}
          className="static w-full h-full opacity-[0.9] object-cover object-center rounded-lg"
        /> */}
        <div className="absolute bottom-0 left-0 right-0 top-0 flex flex-col items-center justify-center gap-2 text-2xl">
          <span className="icon_size material-symbols-outlined font-light">
            groups
          </span>
          <span className="text-[0.4em] leading-none tracking-[0.2em]">
            TEAMS
          </span>
        </div>
      </Link>
      <Link
        href={APP_ROUTES.home}
        className="relative flex h-[5em] w-[5em] flex-col items-center justify-center gap-1 rounded-[1.15em] bg-white text-neutral-900"
      >
        {/* <Image
          width={100}
          height={500}
          src={"/images/lexica/zeros_sun.jpg"}
          alt={""}
          className="static w-full h-full opacity-[0.9] object-cover object-center rounded-lg"
        /> */}
        <div className="absolute bottom-0 left-0 right-0 top-0 flex flex-col items-center justify-center gap-2 text-2xl">
          <span className="icon_size material-symbols-outlined font-light">
            rocket_launch
          </span>
          <span className="text-[0.4em] leading-none tracking-[0.2em]">
            GOALS
          </span>
        </div>
      </Link>
      <Link
        href={APP_ROUTES.home}
        className="relative flex h-[5em] w-[5em] flex-col items-center justify-center gap-1 rounded-[1.15em] bg-white text-neutral-900"
      >
        {/* <Image
          width={100}
          height={500}
          src={"/images/lexica/zeros_sun.jpg"}
          alt={""}
          className="static w-full h-full opacity-[0.9] object-cover object-center rounded-lg"
        /> */}
        <div
          className="absolute bottom-0 left-0 right-0 top-0 flex flex-col items-center justify-center gap-2 text-2xl"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="icon_size material-symbols-outlined font-light">
            editor_choice
          </span>
          <span className="text-[0.4em] leading-none tracking-[0.2em]">
            BADGES
          </span>
        </div>
      </Link>
      <Link
        href={APP_ROUTES.home}
        className="relative flex h-[5em] w-[5em] flex-col items-center justify-center gap-1 rounded-[1.15em] bg-white text-neutral-900"
      >
        {/* <Image
          width={100}
          height={500}
          src={"/images/lexica/zeros_sun.jpg"}
          alt={""}
          className="static w-full h-full opacity-[0.9] object-cover object-center rounded-lg"
        /> */}
        <div className="absolute bottom-0 left-0 right-0 top-0 flex flex-col items-center justify-center gap-2 text-2xl">
          <span className="icon_size material-symbols-outlined font-light">
            monitoring
          </span>
          <span className="text-[0.4em] leading-none tracking-[0.2em]">
            EARN
          </span>
        </div>
      </Link>
      <DrawerComponent isOpen={isOpen} handleClose={handleClose}>
        <div className="p-4">
          <h2 className="mb-6 text-center text-xl font-bold">
            Your Earned Badges
          </h2>
          {loading ? (
            <div className="flex h-[100vh] items-center justify-center">
              <Spinner className="h-10 w-10" />{' '}
            </div>
          ) : badgeRewarded?.length ?? 0 > 0  ? (
            <div className="flex flex-col gap-4">
              {badgeRewarded?.map((badge: BadgeRewarded) => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </div>
          ) : (
            <div className="flex h-[100vh] items-center justify-center">
              No badges found.
            </div>
          )}
        </div>
      </DrawerComponent>
    </div>
  );
};
