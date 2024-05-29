import dayjs from "dayjs";
import { CurrentMonthList } from "./CurrentMonthList";
import { useAppSelector } from "@/utils/redux/store";
interface IThisMonthSectionProps {
  zeroUsers: any;
  currentMonthDayjs: dayjs.Dayjs;
}
export const ThisMonthSection = ({
  zeroUsers,
  currentMonthDayjs,
}: IThisMonthSectionProps) => {
  const loggedInUserMeetingRecord = useAppSelector(
    (state) => state.zerotracker.loggedInUserMeetingRecord
  );
  return (
    <div className="flex flex-row justify-between w-full py-2 px-3 gap-2">
      <div className="h-[175px] overflow-y-scroll flex-1 flex flex-col items-start justify-start gap-1 p-4 rounded-[0.75em] bg-neutral-100 text-neutral-900">
        <p className="text-[0.7em] text-neutral-500 leading-none tracking-[0.2em] mb-3">
          THIS MONTH
        </p>
        <div className="w-full">
          {zeroUsers
            .filter(
              (_zeros: any) =>
                currentMonthDayjs.month() === dayjs(_zeros.date).month()
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
            )
          )}
        </div>
      </div>
    </div>
  );
};
