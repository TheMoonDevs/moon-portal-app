import { useUser } from "@/utils/hooks/useUser";
import { DbUser } from "@/utils/services/models/User";
import Link from "next/link";
import { useRouter } from "next/navigation";

export const DailySection = ({ user }: { user: DbUser }) => {
  const router = useRouter();
  const getTime = () => {
    const date = new Date();
    // get time in a timezone
    const time = date.toLocaleTimeString();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    return `${hours}:${minutes} ${date.getHours() >= 12 ? "PM" : "AM"}`;
  };
  
  const getDate = (pattern: string) => {
    const date = new Date();
    const day = date.getDay();
    const month = date.getMonth();
    const year = date.getFullYear();
    const dayName = date.toLocaleString("default", { weekday: "long" });
    const monthName = date.toLocaleString("default", { month: "long" });
    const monthShortName = date.toLocaleString("default", { month: "short" });
    if (pattern === "full") return `${dayName}, ${day} ${monthName} ${year}`;
    if (pattern === "dayname") return `${dayName}`;
    if (pattern === "mmm") return `${monthShortName} ${date.getDate()}`;
    // check if day is weekday
    const isWeekday = day > 0 && day < 6;
    if (pattern === "daytype") return `${isWeekday ? "weekdays" : "weekends"}`;
    return `${monthName} ${day}`;
  };

  return (
    <div className=" flex flex-col py-1 px-1 mx-2 my-1 gap-3 bg-white rounded-[1.15em]">
      <div className="flex flex-row justify-between border-neutral-400 border-b text-sm px-2 py-3 w-full">
        <h4>
          It&apos;s &nbsp;
          <strong>{getTime()}</strong> &nbsp; now.
        </h4>
        <p className="flex items-center gap-2 pl-2 text-xs border-neutral-400 border-l">
          <span className="icon_size text-neutral-800  material-icons">
            schedule
          </span>
          40Hrs per week
        </p>
      </div>
      <div className="flex flex-row items-center justify-between text-sm p-2 w-full">
        <div className="pl-2">
          <h1 className="font-black text-3xl">{getDate("mmm")}</h1>
          <p className="text-xs">
            {getDate("dayname")} | {user?.timezone}
          </p>
        </div>
        <div className="flex flex-col  gap-2 ">
          <Link
            href={user?.workData?.worklogLink}
            rel="noopener noreferrer"
            target="_blank"
          >
            <div className="text-lg flex flex-row items-center gap-2 bg-neutral-100 rounded-lg px-3 py-1">
              <span className="icon_size text-neutral-800 icon_size material-icons-outlined">
                add_circle_outline
              </span>
              <p className="text-[0.65em] tracking-widest mb-0">Add Worklog</p>
            </div>
          </Link>
          <div className="text-lg flex flex-row items-center gap-2 bg-neutral-100 rounded-lg px-3 py-1">
            <span className="icon_size text-neutral-800 icon_size material-icons-outlined">
              videocam
            </span>
            <p className="text-[0.65em] tracking-widest mb-0">Schedule Meet</p>
          </div>
        </div>
      </div>
      <div className="flex flex-row items-center justify-start text-sm p-2 w-full">
        <p className="text-xs mr-2">Overlaps</p>
        <div className="flex flex-row gap-2">
          {user?.workData?.overlap
            ?.filter(
              (overlap: any) =>
                overlap.scheduleType === "alldays" ||
                overlap.scheduleType === getDate("daytype")
            )
            ?.map((overlap: any, index: number) => (
              <div
                className="flex flex-row gap-1 bg-neutral-100 rounded-lg px-2 py-1"
                key={overlap.start + index}
              >
                <p className="text-xs mb-0 border-r pr-1 border-neutral-400">
                  {overlap.scheduleType}
                </p>
                <p className="text-xs mb-0">
                  {overlap.start} - {overlap.end}
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
