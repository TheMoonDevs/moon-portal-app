import type { BadgeRewarded } from '@db/client';
import type { JsonObject } from '@db/runtime';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import Image from 'next/image';
import { useEffect, useMemo } from 'react';

import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

dayjs.extend(isSameOrAfter);

interface BadgeCardProps {
  badge: BadgeRewarded;
}

const BadgeCard: React.FC<BadgeCardProps> = ({ badge }) => {
  const isAwarded = badge.status === 'REWARDED';
  const isActivated = badge.status === 'ACTIVATED';
  const { user } = useUser();
  const joiningDate = dayjs((user?.workData as JsonObject)?.joining as string);
  const targetDate = dayjs(badge.date);
  const today = dayjs();

  const { progressMessage, progressPercentage } = useMemo(() => {
    let progressMessage = '';
    let progressPercentage = 0;

    if (isActivated && badge.date) {
      const totalDuration = targetDate.diff(joiningDate, 'day');
      const elapsedDuration = today.diff(joiningDate, 'day');

      if (totalDuration > 0) {
        progressPercentage = Math.min(
          (elapsedDuration / totalDuration) * 100,
          100,
        );

        const daysRemaining = targetDate.diff(today, 'day');
        const monthsRemaining = targetDate.diff(today, 'month');

        if (daysRemaining > 0) {
          if (monthsRemaining > 0) {
            const remainingDays = daysRemaining % 30;
            progressMessage = `${monthsRemaining} month${
              monthsRemaining > 1 ? 's' : ''
            } ${remainingDays} day${remainingDays !== 1 ? 's' : ''} left`;
          } else {
            progressMessage = `${daysRemaining} day${
              daysRemaining !== 1 ? 's' : ''
            } left`;
          }
        } else {
          progressMessage = 'Badge expired';
        }
      }
    }

    return { progressMessage, progressPercentage };
  }, [isActivated, badge.date, joiningDate, targetDate, today]);

  const updateBadgeStatusToRewarded = async (badge: BadgeRewarded) => {
    try {
      const response = await PortalSdk.putData('/api/user/badge-rewarded', {
        id: badge.id,
        userId: badge.userId,
        badgeTemplateId: badge.badgeTemplateId,
        name: badge.name,
        sequence: badge.sequence,
        date: dayjs().format('YYYY-MM-DD'),
      });
      console.log('Badge status updated:', response);
    } catch (error) {
      console.error('Error updating badge status:', error);
    }
  };

  useEffect(() => {
    if (isActivated && today.isSameOrAfter(targetDate, 'day')) {
      updateBadgeStatusToRewarded(badge);
    }
  }, [isActivated, targetDate, today, badge]);

  return (
    <div
      className={`relative flex cursor-pointer items-center rounded-lg px-4 py-6 shadow-md transition-transform duration-300 hover:scale-105${
        !isAwarded ? 'bg-[#F7F8FD]' : 'bg-[#E0E4F4]'
      }`}
    >
      <div
        className={`relative size-14 overflow-hidden ${
          isAwarded ? 'border-2 border-gray-200' : 'border-2 border-gray-300'
        }`}
        style={{
          clipPath:
            'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
        }}
      >
        <Image
          src={badge.imageUrl || '/default-badge.png'}
          alt={badge.name}
          layout="fill"
          objectFit="cover"
          className="size-full"
        />
      </div>

      <div className="ml-4 flex flex-1 items-start justify-between">
        <div className="w-full">
          <h3
            className={`text-lg font-semibold ${
              isAwarded ? 'text-gray-800' : 'text-gray-700'
            }`}
          >
            {badge.name}
          </h3>
          {isAwarded && (
            <p className="mt-1 text-xs text-gray-600">
              Awarded on: {dayjs(badge.date)?.format('DD-MM-YYYY')}
            </p>
          )}
          {!isAwarded && isActivated && (
            <>
              <div className="mt-2 w-full flex-1 rounded-full bg-gray-300">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">{progressMessage}</p>
            </>
          )}
        </div>
        {isAwarded && (
          <div className="flex items-center gap-1 rounded-md bg-neutral-300 p-1 text-xs font-semibold text-gray-600">
            <div className="size-3 rounded-full bg-[#18A77C]"></div>
            Earned
          </div>
        )}
      </div>
    </div>
  );
};

export default BadgeCard;
