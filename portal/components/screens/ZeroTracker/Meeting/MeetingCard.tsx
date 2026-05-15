import type { User } from '@db/client';

import type { IMeetingData } from '@/utils/redux/zerotracker/zerotracker.slice';

interface MeetingCardProps {
  meeting: IMeetingData;
  dayjs: any;
  handleMeetingCardClick: (meeting: any) => void;
}

export const MeetingCard = ({
  meeting,
  dayjs,
  handleMeetingCardClick,
}: MeetingCardProps) => {
  return (
    <div
      className="flex cursor-pointer flex-col-reverse gap-2"
      onClick={() => handleMeetingCardClick(meeting)}
    >
      <div className="flex items-center justify-between rounded-lg bg-neutral-100 p-2 transition-all delay-100 hover:bg-blue-200">
        <div className="flex flex-col gap-2">
          <p className="text-[0.7em] font-bold tracking-[0.2em]">
            {meeting?.title}
          </p>
          <p className="text-[0.7em] leading-none text-neutral-500">
            {dayjs(meeting?.date).format('DD MMM YYYY')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex">
            {meeting?.members?.map((member: User, index: number) => {
              return (
                <div key={index} className="flex items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="size-5 rounded-full"
                    src={member?.avatar as string}
                    alt={member?.name as string}
                  />
                </div>
              );
            })}
          </div>
          <span className="icon_size material-icons">chevron_right</span>
        </div>
      </div>
    </div>
  );
};
