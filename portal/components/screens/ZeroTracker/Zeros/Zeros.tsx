import dayjs from "dayjs";
import React from "react";
import { TrackerMode } from "../ZeroTracker";
import CircularLoader from "@/components/elements/CircularLoader";
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
    <div className="flex flex-col justify-between w-full p-4 gap-2">
      <div className="flex flex-row items-center justify-start gap-1  overflow-hidden text-neutral-900">
        <p className="text-[1.5em] font-bold ">
          {" "}
          Select your Zeros in Calendar
        </p>
        {/* <span className="icon_size material-icons">ios_arrow_forward</span> */}
      </div>
      <p className="text-[0.7em] text-neutral-500 leading-none ">
        Note that zeros are paid holidays/vacations and will not effect stipend.
      </p>
      <div className="flex flex-row items-center justify-start gap-1 my-2 cursor-pointer">
        {selectedDates
          .filter((date) => dayjs(date).month() === currentMonthDayjs.month())
          .map((date, index) => (
            <div
              key={index}
              className="flex flex-row items-center justify-center gap-1 p-2 rounded-[0.75em] bg-white-500 border border-blue-500 text-neutral-900"
            >
              <p className="text-[0.7em] font-bold tracking-[0.2em] ">
                {" "}
                {dayjs(date).format("DD") + " " + dayjs(date).format("MMM")}
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
          onClick={() => setTrackerMode("normal")}
          disabled={isSavingZeroes}
          className={` ${isSavingZeroes ? 'bg-neutral-300	 text-white' : 'bg-neutral-100 text-neutral-900'} flex-1 flex-grow flex flex-row items-center justify-start gap-1 p-4 rounded-[0.75em] `}
        >
          <span className="icon_size material-symbols-outlined">
            arrow_back
          </span>
          <p className="text-[0.7em] whitespace-nowrap font-bold tracking-[0.2em] ">
            {" "}
            BACK
          </p>
        </button>
        <button
          onClick={updateDates}
          disabled = {isSavingZeroes}
          className={`${isSavingZeroes ? 'bg-neutral-300	' : 'bg-blue-500'} flex flex-row items-center justify-between gap-1 p-4 rounded-[0.75em] overflow-hidden text-neutral-100`}
        >
          <p className="text-[0.7em] font-bold tracking-[0.2em] ">
            {" "}
            SAVE CHANGES
          </p>
          {!isSavingZeroes && 
            <span className="icon_size material-icons">task_alt</span>
          }
          {isSavingZeroes && 
            <CircularLoader/>
          }
        </button>
      </div>
    </div>
  );
};
