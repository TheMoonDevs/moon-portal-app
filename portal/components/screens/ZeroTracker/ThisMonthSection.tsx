import dayjs from 'dayjs';

import { useAppSelector } from '@/utils/redux/store';

import { CurrentMonthList } from './CurrentMonthList';
interface IThisMonthSectionProps {
  zeroUsers: any;
  currentMonthDayjs: dayjs.Dayjs;
}
export const ThisMonthSection = ({
  zeroUsers,
  currentMonthDayjs,
}: IThisMonthSectionProps) => {
  const loggedInUserMeetingRecord = useAppSelector(
    (state) => state.zerotracker.loggedInUserMeetingRecord,
  );
  return (
    <div className="flex w-full flex-row justify-between gap-2 px-3 py-2">
      <div className="flex h-[175px] flex-1 flex-col items-start justify-start gap-1 overflow-y-scroll rounded-[0.75em] bg-neutral-100 p-4 text-neutral-900">
        <p className="mb-3 text-[0.7em] leading-none tracking-[0.2em] text-neutral-500">
          THIS MONTH
        </p>
        <div className="w-full">
          {zeroUsers
            .filter(
              (_zeros: any) =>
                currentMonthDayjs.month() === dayjs(_zeros.date).month(),
            )
            .map((zeroWithUsers: any, _index: number) => (
              <CurrentMonthList
                key={_index}
                item={zeroWithUsers}
                itemMembers={zeroWithUsers.users}
              />
            ))}
          {loggedInUserMeetingRecord?.allMeetings?.map(
            (meeting: any, index: number) => (
              <CurrentMonthList
                key={index}
                item={meeting}
                itemMembers={meeting.members}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
};
