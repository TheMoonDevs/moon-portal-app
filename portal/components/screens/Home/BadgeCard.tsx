import { useEffect } from 'react';
import { useUser } from '@/utils/hooks/useUser';
import dayjs from 'dayjs';
import Image from 'next/image';
import { BadgeRewarded } from '@prisma/client';
import { Award } from 'lucide-react';
import { JsonObject } from '@prisma/client/runtime/library';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
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

  let progressMessage = '';
  let progressPercentage = 0;

  if (isActivated && badge.date) {
    const totalDuration = targetDate.diff(joiningDate, 'day');
    const elapsedDuration = today.diff(joiningDate, 'day');

    if (totalDuration > 0) {
      progressPercentage = Math.min(
        (elapsedDuration / totalDuration) * 100,
        100
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

  const updateBadgeStatusToRewarded = async (badge: BadgeRewarded) => {
    try {
      const response = await PortalSdk.putData('/api/user/badge-rewarded', {
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
      className={`relative flex flex-col items-center p-6 rounded-lg shadow-lg transition-transform duration-300 transform hover:scale-105 cursor-pointer ${
        isAwarded
          ? 'bg-gradient-to-r from-yellow-200 via-orange-200 to-red-200 '
          : 'bg-gray-200 border border-gray-400'
      }`}
    >
      <div
        className={`w-24 h-24 rounded-full overflow-hidden shadow-lg ${
          isAwarded
            ? 'border-4 border-gradient-to-r from-yellow-400 via-orange-500 to-red-500'
            : 'border-2 border-gray-300'
        }`}
      >
        <Image
          src={badge.imageUrl || '/default-badge.png'}
          alt={badge.name}
          width={96}
          height={96}
          className='object-cover w-full h-full'
        />
      </div>

      <div className='mt-4 flex-1 text-center'>
        <h3
          className={`text-xl font-semibold ${
            isAwarded ? 'text-gray-900' : 'text-gray-800'
          }`}
        >
          {badge.name}
        </h3>
        {isAwarded && (
          <p className='text-sm text-gray-600 mt-1'>
            Awarded on: {dayjs(badge.date)?.format('DD-MM-YYYY')}
          </p>
        )}
        {isActivated && (
          <>
            <div className='w-full bg-gray-300 rounded-full mt-2'>
              <div
                className='bg-green-500 h-2 rounded-full'
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className='text-sm text-gray-700 mt-2 font-medium'>
              {progressMessage}
            </p>
            <p className='text-sm text-gray-600 mt-1'>
              {progressPercentage >= 100
                ? 'Great progress! Keep up the great work!'
                : 'You’re on track to complete this badge. Keep going!'}
            </p>
          </>
        )}
      </div>

      {isAwarded && (
        <div className='absolute top-4 right-4'>
          <Award className='text-yellow-500 w-8 h-8' />
        </div>
      )}

      {isAwarded && (
        <div className='absolute top-0 left-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white text-xs px-4 py-2 rounded-br-lg rounded-tl-lg shadow-lg'>
          <span className='font-semibold'>Rewarded</span>
        </div>
      )}
    </div>
  );
};

export default BadgeCard;
