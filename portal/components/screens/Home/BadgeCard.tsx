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
      className={`relative flex items-center px-4 py-6 rounded-lg shadow-md transition-transform duration-300 transform hover:scale-105 cursor-pointer ${
        !isAwarded ? 'bg-[#F7F8FD]' : 'bg-[#E0E4F4]'
      }`}
    >
      <div
        className={`w-14 h-14 relative overflow-hidden ${
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
          layout='fill'
          objectFit='cover'
          className='w-full h-full'
        />
      </div>

      <div className=' ml-4 flex-1 flex items-start justify-between'>
        <div className='w-full'>
          <h3
            className={`text-lg font-semibold ${
              isAwarded ? 'text-gray-800' : 'text-gray-700'
            }`}
          >
            {badge.name}
          </h3>
          {isAwarded && (
            <p className='text-xs text-gray-600 mt-1'>
              Awarded on: {dayjs(badge.date)?.format('DD-MM-YYYY')}
            </p>
          )}
          {!isAwarded && isActivated && (
            <>
              <div className='flex-1 w-full bg-gray-300 rounded-full mt-2'>
                <div
                  className='bg-blue-500 h-2 rounded-full'
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className='text-xs text-gray-500 mt-2'>{progressMessage}</p>
            </>
          )}
        </div>
        {isAwarded && (
          <div className='flex items-center gap-1 p-1 bg-neutral-300 rounded-md text-xs font-semibold text-gray-600'>
            <div className='w-3 h-3 rounded-full bg-[#18A77C]'></div>
            Earned
          </div>
        )}
      </div>
    </div>
  );
};

export default BadgeCard;
