import type { Dayjs } from 'dayjs';
import Link from 'next/link';

import { APP_ROUTES } from '@/utils/constants/appInfo';

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
    <div className="flex flex-row items-center justify-start gap-3 border-b border-neutral-400 bg-white p-3">
      <Link
        href={APP_ROUTES.home}
        className="cursor-pointer rounded-lg p-2 pt-3 text-neutral-900 hover:text-neutral-700"
      >
        <span className="icon_size material-icons">arrow_back</span>
      </Link>
      <h1 className="font-mono text-xl uppercase tracking-[0.2em]">TRACKER</h1>
      <div className="ml-auto flex flex-row items-center justify-end gap-3">
        <button
          onClick={() =>
            setCurrentMonthDayJs((_monthjs) =>
              dayjs(_monthjs).subtract(1, 'month'),
            )
          }
          className="text-md flex size-[1.5em] flex-col items-center justify-center rounded-full bg-neutral-100"
        >
          <span className="icon_size material-symbols-outlined">
            chevron_left
          </span>
        </button>
        <div className="flex flex-row gap-1 rounded-lg text-xs text-neutral-900 hover:text-neutral-700">
          <span className="text-md font-bold uppercase leading-none tracking-wide">
            {currentMonthDayjs.format('MMM')}
          </span>
          <span className="text-xs leading-none">
            {currentMonthDayjs.format('YYYY')}
          </span>
        </div>
        <button
          onClick={() =>
            setCurrentMonthDayJs((_monthjs) => dayjs(_monthjs).add(1, 'month'))
          }
          className="text-md flex size-[1.5em] flex-col items-center justify-center rounded-full bg-neutral-100"
        >
          <span className="icon_size material-symbols-outlined">
            chevron_right
          </span>
        </button>
      </div>
    </div>
  );
};
