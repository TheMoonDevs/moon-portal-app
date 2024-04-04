import { getDateInFormat, getTimeInFormat } from "@/utils/helpers/prettyprint";
import { useUser } from "@/utils/hooks/useUser";
import { User } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export const DailySection = ({ user }: { user: User }) => {
  const router = useRouter();

  return (
    <div className=" flex flex-col py-1 px-1 mx-2 my-1 gap-3 bg-white rounded-[1.15em]">
      <div className="flex flex-row justify-between border-neutral-400 border-b text-sm px-2 py-3 w-full">
        <h4>
          It&apos;s &nbsp;
          <strong>{getTimeInFormat()}</strong> &nbsp; now.
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
          <h1 className="font-black text-3xl">{getDateInFormat("mmm")}</h1>
          <p className="text-xs">
            {getDateInFormat("dayname")} | {user?.timezone}
          </p>
        </div>
        {/* <div className="flex flex-col  gap-2 ">
          <Link
            href={(user?.workData as any)?.worklogLink || ""}
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
        </div> */}
      </div>
      {/* <div className="flex flex-row items-center justify-start text-sm p-2 w-full">
        <p className="text-xs mr-2">Overlaps</p>
        <div className="flex flex-row gap-2">
          {(user?.workData as any)?.overlap
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
      </div> */}
    </div>
  );
};
