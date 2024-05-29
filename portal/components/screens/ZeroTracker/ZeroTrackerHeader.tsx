import { APP_ROUTES } from "@/utils/constants/appInfo";
import { Dayjs } from "dayjs";
import Link from "next/link";

export const ZeroTrackerHeader = ({
  currentMonthDayjs,
  setCurrentMonthDayJs,
  dayjs,
}: {
  currentMonthDayjs: Dayjs;
  setCurrentMonthDayJs: React.Dispatch<React.SetStateAction<Dayjs>>;
  dayjs: (date?: string | number | Dayjs | Date | null | undefined) => Dayjs;
}) => {
  return (
    <div className="bg-white flex flex-row gap-3 py-3 px-3 items-center justify-start border-b border-neutral-400">
      <Link
        href={APP_ROUTES.home}
        className="cursor-pointer rounded-lg p-2 pt-3 text-neutral-900 hover:text-neutral-700"
      >
        <span className="icon_size material-icons">arrow_back</span>
      </Link>
      <h1 className="uppercase tracking-[0.2em] font-mono text-xl">TRACKER</h1>
      <div className="ml-auto flex flex-row items-center justify-end gap-3 ">
        <div
          onClick={() =>
            setCurrentMonthDayJs((_monthjs) =>
              dayjs(_monthjs).subtract(1, "month")
            )
          }
          className="text-md flex flex-col w-[1.5em] h-[1.5em] items-center justify-center rounded-full bg-neutral-100"
        >
          <span className="icon_size material-symbols-outlined">
            chevron_left
          </span>
        </div>
        <div className="text-xs flex flex-row gap-1 rounded-lg text-neutral-900 hover:text-neutral-700">
          <span className="text-md uppercase tracking-wide font-bold leading-none">
            {currentMonthDayjs.format("MMM")}
          </span>
          <span className="text-xs leading-none">
            {currentMonthDayjs.format("YYYY")}
          </span>
        </div>
        <div
          onClick={() =>
            setCurrentMonthDayJs((_monthjs) => dayjs(_monthjs).add(1, "month"))
          }
          className="text-md flex flex-col w-[1.5em] h-[1.5em] items-center justify-center rounded-full bg-neutral-100"
        >
          <span className="icon_size material-symbols-outlined">
            chevron_right
          </span>
        </div>
      </div>
    </div>
  );
};
