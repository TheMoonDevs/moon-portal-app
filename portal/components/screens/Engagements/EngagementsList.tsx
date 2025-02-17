import { Engagement, User } from '@prisma/client';
import React from 'react';
import { EngagementTeam } from './EngagementTeam';
import dayjs from 'dayjs';

const EngagementsList = ({
  engagements,
  activeEngagement,
  setActiveEngagement,
  team,
}: {
  engagements: Engagement[];
  activeEngagement: Engagement | null;
  setActiveEngagement: (engagement: Engagement) => void;
  team: User[];
}) => {
  return (
    <div className='flex flex-col gap-2'>
      {engagements.map((engagement) => (
        <div
          key={engagement.id}
          className={`w-full cursor-pointer rounded-xl border border-neutral-300 bg-white p-4 shadow-sm transition hover:shadow-md ${
            activeEngagement?.id === engagement.id
              ? 'border-neutral-500 bg-neutral-100'
              : ''
          }`}
          onClick={() => setActiveEngagement(engagement)}
        >
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
            <h3 className="text-base font-semibold text-neutral-800">
              {engagement.title}
            </h3>
            <span className="material-symbols-outlined text-neutral-500">
              chevron_right
            </span>
          </div>
          <div className="flex flex-col items-start gap-2 px-1 pt-3 text-neutral-700">
            <div className="flex w-full flex-row items-center justify-between gap-2">
              <p className="text-lg font-bold">
                {engagement.engagementType === 'FIXED'
                  ? `${engagement.progressPercentage}%`
                  : `${engagement.numberOfHours}Hrs`}
              </p>
              <p className="text-xs">
                {dayjs(engagement.startDate).format('DD MMM YYYY')} to{' '}
                {engagement.endDate
                  ? dayjs(engagement.endDate).format('DD MMM YYYY')
                  : '---'}
              </p>
            </div>
            <EngagementTeam
              activeEngagement={engagement}
              team={team}
              isCompact={true}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default EngagementsList;
