import { IMeetingData } from "@/utils/redux/zerotracker/zerotracker.slice";
import { User } from "@prisma/client";

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
      className="flex flex-col-reverse gap-2 cursor-pointer"
      onClick={() => handleMeetingCardClick(meeting)}
    >
      <div className="flex justify-between items-center bg-neutral-100 p-2 rounded-lg hover:bg-blue-200 transition-all delay-100">
        <div className="flex flex-col gap-2">
          <p className="text-[0.7em] font-bold tracking-[0.2em] ">
            {meeting?.title}
          </p>
          <p className="text-[0.7em] text-neutral-500 leading-none ">
            {dayjs(meeting?.date).format("DD MMM YYYY")}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex">
            {meeting?.members?.map((member: User, index: number) => {
              return (
                <div key={index} className="flex items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="w-5 h-5 rounded-full"
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
