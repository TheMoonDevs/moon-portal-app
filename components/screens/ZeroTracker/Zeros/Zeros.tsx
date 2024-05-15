import dayjs from "dayjs";
import React from "react";
import { TrackerMode } from "../ZeroTracker";
interface IZerosProps {
  selectedDates: string[];
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
        <div
          onClick={() => setTrackerMode("normal")}
          className="cursor-pointer flex-1 flex-grow flex flex-row items-center justify-start gap-1 p-4 rounded-[0.75em] bg-neutral-100 text-neutral-900"
        >
          <span className="icon_size material-symbols-outlined">
            arrow_back
          </span>
          <p className="text-[0.7em] whitespace-nowrap font-bold tracking-[0.2em] ">
            {" "}
            BACK
          </p>
        </div>
        <div
          onClick={updateDates}
          className="cursor-pointer flex flex-row items-center justify-between gap-1 p-4 rounded-[0.75em] overflow-hidden bg-blue-500 text-neutral-100"
        >
          <p className="text-[0.7em] font-bold tracking-[0.2em] ">
            {" "}
            SAVE CHANGES
          </p>
          <span className="icon_size material-icons">task_alt</span>
        </div>
      </div>
    </div>
  );
};
