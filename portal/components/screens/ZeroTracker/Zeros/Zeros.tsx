import { CircularProgress } from '@mui/material';
import dayjs from 'dayjs';
import React from 'react';

import type { TrackerMode } from '../ZeroTracker';
interface IZerosProps {
  selectedDates: string[];
  isSavingZeroes: boolean;
  currentMonthDayjs: dayjs.Dayjs;
  setTrackerMode: React.Dispatch<React.SetStateAction<TrackerMode>>;
  handleZeroDateClick: React.Dispatch<React.SetStateAction<any>>;
  updateDates: () => void;
}
export const Zeros = ({
  selectedDates,
  currentMonthDayjs,
  setTrackerMode,
  handleZeroDateClick,
  updateDates,
  isSavingZeroes,
}: IZerosProps) => {
  return (
    <div className="flex w-full flex-col justify-between gap-2 p-4">
      <div className="flex flex-row items-center justify-start gap-1 overflow-hidden text-neutral-900">
        <p className="text-[1.5em] font-bold"> Select your Zeros in Calendar</p>
        {/* <span className="icon_size material-icons">ios_arrow_forward</span> */}
      </div>
      <p className="text-[0.7em] leading-none text-neutral-500">
        Note that zeros are paid holidays/vacations and will not effect stipend.
      </p>
      <div className="my-2 flex cursor-pointer flex-row items-center justify-start gap-1">
        {selectedDates
          .filter((date) => dayjs(date).month() === currentMonthDayjs.month())
          .map((date, index) => (
            <div
              key={index}
              className="bg-white-500 flex flex-row items-center justify-center gap-1 rounded-[0.75em] border border-blue-500 p-2 text-neutral-900"
            >
              <p className="text-[0.7em] font-bold tracking-[0.2em]">
                {' '}
                {dayjs(date).format('DD') + ' ' + dayjs(date).format('MMM')}
              </p>
              <span
                onClick={handleZeroDateClick}
                className="icon_size material-icons"
              >
                close
              </span>
            </div>
          ))}
      </div>
      <div className="flex flex-row gap-2">
        <button
          onClick={() => setTrackerMode('normal')}
          disabled={isSavingZeroes}
          className={` ${
            isSavingZeroes
              ? 'bg-neutral-300 text-white'
              : 'bg-neutral-100 text-neutral-900'
          } flex flex-1 grow flex-row items-center justify-start gap-1 rounded-[0.75em] p-4`}
        >
          <span className="icon_size material-symbols-outlined">
            arrow_back
          </span>
          <p className="whitespace-nowrap text-[0.7em] font-bold tracking-[0.2em]">
            BACK
          </p>
        </button>
        <button
          onClick={updateDates}
          disabled={isSavingZeroes}
          className={`${
            isSavingZeroes ? 'bg-neutral-300' : 'bg-blue-500'
          } flex flex-row items-center justify-between gap-1 overflow-hidden rounded-[0.75em] p-4 text-neutral-100`}
        >
          <p className="text-[0.7em] font-bold tracking-[0.2em]">
            {' '}
            SAVE CHANGES
          </p>
          {!isSavingZeroes && (
            <span className="icon_size material-icons">task_alt</span>
          )}
          {isSavingZeroes && <CircularProgress size={20} color="inherit" />}
        </button>
      </div>
    </div>
  );
};
