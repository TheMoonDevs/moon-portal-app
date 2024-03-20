"use client";

import { APP_ROUTES } from "@/utils/constants/appInfo";
import { useUser } from "@/utils/hooks/useUser";
import Link from "next/link";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { PortalSdk } from "@/utils/services/PortalSdk";

const dayjsLib = dayjs();
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const ZeroTrackerPage = () => {
  const { user } = useUser(false);
  const [zeroRecord, setZeroRecord] = useState<any>(null);
  const [trackerMode, setTrackerMode] = useState<
    "leave" | "zero" | "normal" | "extra"
  >("normal");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    PortalSdk.getData(`/api/user/zeros?userId=${user?.id}`, null)
      .then(({ data }) => {
        //console.log(data);
        if (data?.zeroRecords?.length === 0 || !data?.zeroRecords) return;
        setZeroRecord(data.zeroRecords[0]);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setIsLoading(false);
      });
  }, [user]);

  const updateDates = () => {
    let _newTypeZeros = [...selectedDates];
    const _zeros = zeroRecord?.allZeros
      ? zeroRecord.allZeros?.filter((a_zero: any) => {
          return a_zero.type !== trackerMode;
        })
      : [];
    const type_zeros = zeroRecord?.allZeros
      ? zeroRecord.allZeros?.filter((a_zero: any) => {
          return (
            a_zero.type === trackerMode && _newTypeZeros.includes(a_zero.date)
          );
        })
      : [];
    _newTypeZeros = _newTypeZeros.filter((date) => {
      return !type_zeros.find((a_zero: any) => a_zero.date === date);
    });
    _zeros.push(
      ...type_zeros,
      ..._newTypeZeros.map((date) => ({ date, type: trackerMode }))
    );
    const _zeroRecord = {
      ...zeroRecord,
      year: dayjsLib.format("YYYY"),
      userId: user?.id,
      allZeros: _zeros,
    };
    //console.log("final zeros record", _zeroRecord);
    setTrackerMode("normal");
    setSelectedDates([]);
    PortalSdk.putData(`/api/user/zeros`, { data: _zeroRecord })
      .then(({ data }) => {
        console.log(data);
        if (!data?.zeroRecords) return;
        setZeroRecord(data.zeroRecords);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  if (!user?.workData) return null;

  const today = new Date();
  const _today = dayjs(today);
  const lastDayOfPrevMonth = _today.subtract(1, "month").endOf("month").date();
  const firstDayOfThisMonth = _today.startOf("month").day();
  const lastDayOfThisMonth = _today.endOf("month").day();
  const totalWorkingDays = Array.from({
    length: dayjsLib.daysInMonth(),
  }).filter((_, index) => {
    const date = dayjsLib.date(index + 1);
    return date.day() !== 0 && date.day() !== 6;
  }).length;
  const totalZeros = zeroRecord?.allZeros?.filter(
    (a_zero: any) => a_zero.type === "zero"
  ).length;
  const totalExtraWork = zeroRecord?.allZeros?.filter(
    (a_zero: any) => a_zero.type === "extra"
  ).length;
  const totalLeaves = zeroRecord?.allZeros?.filter(
    (a_zero: any) => a_zero.type === "leave"
  ).length;
  const percentage = (
    ((totalExtraWork - totalLeaves) * 100) /
    totalWorkingDays
  ).toFixed(1);
  const zeroUsage = ((totalZeros / 30) * 100).toFixed(0);

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <div className="bg-white flex flex-row gap-3 py-3 px-3 items-center justify-start border-b border-neutral-400">
          <Link
            href={APP_ROUTES.home}
            className="cursor-pointer rounded-lg p-2 pt-3 text-neutral-900 hover:text-neutral-700"
          >
            <span className="icon_size material-icons">arrow_back</span>
          </Link>
          <h1 className="uppercase tracking-[0.2em] font-mono text-xl">
            ZERO TRACKER
          </h1>
          <div className="text-xs flex flex-row gap-1 ml-auto rounded-lg text-neutral-900 hover:text-neutral-700">
            <span>{dayjsLib.format("MMMM")}</span>
            <span>{dayjsLib.format("YYYY")}</span>
          </div>
        </div>
        <div className="flex flex-row items-center justify-center gap-2 h-[400px]">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-neutral-800"></div>
          <p className="text-neutral-900">Initialising...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="bg-white flex flex-row gap-3 py-3 px-3 items-center justify-start border-b border-neutral-400">
        <Link
          href={APP_ROUTES.home}
          className="cursor-pointer rounded-lg p-2 pt-3 text-neutral-900 hover:text-neutral-700"
        >
          <span className="icon_size material-icons">arrow_back</span>
        </Link>
        <h1 className="uppercase tracking-[0.2em] font-mono text-xl">
          ZERO TRACKER
        </h1>
        <div className="text-xs flex flex-row gap-1 ml-auto rounded-lg text-neutral-900 hover:text-neutral-700">
          <span>{dayjsLib.format("MMMM")}</span>
          <span>{dayjsLib.format("YYYY")}</span>
        </div>
      </div>
      <div className="calendar">
        <div className="calendar-body">
          <div className="grid grid-cols-7 gap-1 bg-neutral-100">
            {days.map((day) => (
              <div key={day} className="p-3 text-sm font-mono tracking-[0.1em]">
                <span>{day}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDayOfThisMonth }).map((_, index) => {
              const date = dayjsLib.date(
                lastDayOfPrevMonth - firstDayOfThisMonth + index + 1
              );
              return (
                <div
                  key={index}
                  className={`p-3 text-sm text-uppercase tracking-[0.1em]
                      text-neutral-200`}
                >
                  <span>{date.format("D")}</span>
                </div>
              );
            })}
            {Array.from({ length: dayjsLib.daysInMonth() }).map((_, index) => {
              const date = dayjsLib.date(index + 1);
              const isToday = date.isSame(today, "date");
              const isWeekEnds = date.day() === 0 || date.day() === 6;
              const dateFromRecords = zeroRecord?.allZeros?.find(
                (a_zero: any) => a_zero.date === date.format("YYYY-MM-DD")
              );
              let isClickDisabled =
                (trackerMode == "leave" || trackerMode == "zero") && isWeekEnds;
              if (!isClickDisabled)
                isClickDisabled =
                  (trackerMode == "leave" || trackerMode == "zero") &&
                  date.isBefore(_today, "date");
              return (
                <div
                  key={index}
                  className={`relative p-3 text-sm text-uppercase tracking-[0.1em] flex items-center justify-center ${
                    isToday ? "bg-neutral-100 font-black rounded-full" : ""
                  }`}
                  onClick={() => {
                    if (isClickDisabled) return;
                    if (trackerMode === "leave" || trackerMode === "zero") {
                      setSelectedDates((_dates) => {
                        if (_dates.includes(date.format("YYYY-MM-DD")))
                          return _dates.filter(
                            (a_date) => a_date !== date.format("YYYY-MM-DD")
                          );
                        else return [..._dates, date.format("YYYY-MM-DD")];
                      });
                    }
                    if (trackerMode === "normal" && dateFromRecords) {
                      setTrackerMode(dateFromRecords.type);
                      setSelectedDates(
                        zeroRecord?.allZeros
                          ?.filter(
                            (a_zero: any) =>
                              a_zero.type === dateFromRecords.type
                          )
                          .map((a_zero: any) => a_zero.date) || []
                      );
                      //updateZeros([date.format("D")]);
                    }
                  }}
                >
                  {trackerMode != "normal" &&
                    selectedDates.includes(date.format("YYYY-MM-DD")) && (
                      <span
                        className={`border border-${
                          trackerMode === "leave"
                            ? "red"
                            : trackerMode === "zero"
                            ? "blue"
                            : "unkown"
                        }-500 rounded-full absolute top-0 bottom-0 w-full h-full`}
                      ></span>
                    )}
                  <span
                    className={`${isClickDisabled ? "text-neutral-200" : ""} `}
                  >
                    {date.format("D")}
                  </span>
                  {dateFromRecords && (
                    <span
                      className={`${
                        dateFromRecords.type === "zero"
                          ? "bg-blue-500"
                          : dateFromRecords.type === "leave"
                          ? "bg-red-500"
                          : "bg-neutral-200"
                      } absolute top-1 right-[40%] w-2 h-2 rounded-full`}
                    ></span>
                  )}
                </div>
              );
            })}
            {Array.from({ length: 7 - (lastDayOfThisMonth + 1) }).map(
              (_, index) => {
                const date = dayjsLib.date(index + 1);
                return (
                  <div
                    key={index}
                    className={`p-3 text-sm text-uppercase tracking-[0.1em]
                        text-neutral-200`}
                  >
                    <span>{date.format("D")}</span>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>
      {trackerMode === "normal" && (
        <div className="flex flex-row justify-between w-full py-2 px-3 gap-2">
          <div className="relative flex-1 flex flex-col items-start justify-center gap-1 p-4 rounded-[0.75em] overflow-hidden bg-neutral-100 text-neutral-900">
            <span
              style={{ width: `${zeroUsage != "NaN" ? zeroUsage : 0}%` }}
              className=" bg-blue-500 h-1 rounded-[1.15em] absolute top-0 left-0 right-0"
            ></span>
            <p className="text-[0.7em] text-neutral-500 leading-none tracking-[0.2em] ">
              {" "}
              ZEROS
            </p>
            <p className="text-[1.3em] font-bold leading-none ">
              {" "}
              {zeroRecord?.allZeros?.filter(
                (_zero: any) => _zero.type === "zero"
              ).length || "0"}{" "}
              / 30
            </p>
          </div>
          <div className="relative flex-1 flex flex-col items-start justify-center gap-1 p-4 rounded-[0.75em] overflow-hidden bg-neutral-100 text-neutral-900">
            <span
              style={{ width: `${percentage != "NaN" ? -percentage : 0}%` }}
              className=" bg-red-500 h-1 rounded-[1.15em] absolute top-0 left-0 right-0"
            ></span>
            <p className="text-[0.7em] text-neutral-500 leading-none tracking-[0.2em] ">
              {" "}
              LEAVES
            </p>
            <p className="text-[1.3em] font-bold leading-none ">
              {" "}
              {!percentage || isNaN(parseInt(percentage)) ? "0" : percentage}%
            </p>
          </div>
        </div>
      )}
      {trackerMode === "normal" && (
        <div className="flex flex-row justify-between w-full py-2 px-3 gap-2">
          <div className="h-[175px] flex-1 flex flex-col items-start justify-start gap-1 p-4 rounded-[0.75em] bg-neutral-100 text-neutral-900">
            <p className="text-[0.7em] text-neutral-500 leading-none tracking-[0.2em] ">
              {" "}
              THIS MONTH
            </p>
            <div></div>
          </div>
          <div className="flex flex-col gap-2">
            <div
              onClick={() => {
                //console.log("leave", zeroRecord);
                setTrackerMode("leave");
                setSelectedDates(
                  zeroRecord?.allZeros
                    ?.filter((a_zero: any) => a_zero.type === "leave")
                    .map((a_zero: any) => a_zero.date) || []
                );
              }}
              className="flex flex-row items-center justify-between gap-1 p-4 rounded-[0.75em] overflow-hidden bg-red-500 text-neutral-100"
            >
              <p className="text-[0.7em] font-bold tracking-[0.2em] ">
                {" "}
                LEAVE MARKER
              </p>
              <span className="icon_size material-icons">
                add_circle_outline
              </span>
            </div>
            <div
              onClick={() => {
                setTrackerMode("zero");
                setSelectedDates(
                  zeroRecord?.allZeros
                    ?.filter((a_zero: any) => a_zero.type === "zero")
                    .map((a_zero: any) => a_zero.date) || []
                );
              }}
              className="flex flex-row items-center justify-between gap-1 p-4 rounded-[0.75em] overflow-hidden bg-blue-500 text-neutral-100"
            >
              <p className="text-[0.7em] font-bold tracking-[0.2em] ">
                {" "}
                ZERO MARKER
              </p>
              <span className="icon_size material-icons">
                add_circle_outline
              </span>
            </div>
            <div
              onClick={() => {
                // setTrackerMode("extra");
                // setSelectedDates(
                //   zeroRecord?.allZeros
                //     ?.filter((a_zero: any) => a_zero.type === "extra")
                //     .map((a_zero: any) => a_zero.date) || []
                // );
              }}
              className="flex flex-row items-center justify-between gap-1 p-4 rounded-[0.75em] overflow-hidden bg-green-500 text-neutral-100"
            >
              <p className="text-[0.7em] font-bold tracking-[0.2em] ">
                {" "}
                EXTRA WORK
              </p>
              <span className="icon_size material-icons">
                add_circle_outline
              </span>
            </div>
          </div>
        </div>
      )}
      {trackerMode === "leave" && (
        <div className="flex flex-col justify-between w-full p-4 gap-2">
          <div className="flex flex-row items-center justify-start gap-1  overflow-hidden text-neutral-900">
            <p className="text-[1.5em] font-bold  ">
              {" "}
              Select your Leaves in Calendar
            </p>
            {/* <span className="icon_size material-icons">ios_arrow_forward</span> */}
          </div>
          <p className="text-[0.7em] text-neutral-500 leading-none ">
            Note that leaves will cause a deduction in your stipend.
          </p>
          <div className="flex flex-row items-center justify-start gap-1 my-2">
            {selectedDates.map((date, index) => (
              <div
                key={index}
                className="flex flex-row items-center justify-center gap-1 p-2 rounded-[0.75em] bg-white-500 border border-red-500 text-neutral-900"
              >
                <p className="text-[0.7em] font-bold tracking-[0.2em] ">
                  {" "}
                  {dayjs(date).format("DD")}
                </p>
                <span
                  onClick={() => {
                    if (dayjs(date).isBefore(_today, "date")) return;
                    setSelectedDates((_dates) =>
                      _dates.filter((a_date) => a_date !== date)
                    );
                  }}
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
              className="flex-1 flex-grow flex flex-row items-center justify-start gap-1 p-4 rounded-[0.75em] bg-neutral-100 text-neutral-900"
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
              className="flex-1 flex-grow flex flex-row items-center justify-start gap-1 p-4 rounded-[0.75em] bg-red-500 text-neutral-100"
            >
              <p className="text-[0.7em] whitespace-nowrap font-bold tracking-[0.2em] ">
                {" "}
                SAVE CHANGES
              </p>
              <span className="icon_size material-icons">task_alt</span>
            </div>
          </div>
        </div>
      )}
      {trackerMode === "zero" && (
        <div className="flex flex-col justify-between w-full p-4 gap-2">
          <div className="flex flex-row items-center justify-start gap-1  overflow-hidden text-neutral-900">
            <p className="text-[1.5em] font-bold ">
              {" "}
              Select your Zeros in Calendar
            </p>
            {/* <span className="icon_size material-icons">ios_arrow_forward</span> */}
          </div>
          <p className="text-[0.7em] text-neutral-500 leading-none ">
            Note that zeros are paid leaves and will not effect stipend.
          </p>
          <div className="flex flex-row items-center justify-start gap-1 my-2">
            {selectedDates.map((date, index) => (
              <div
                key={index}
                className="flex flex-row items-center justify-center gap-1 p-2 rounded-[0.75em] bg-white-500 border border-blue-500 text-neutral-900"
              >
                <p className="text-[0.7em] font-bold tracking-[0.2em] ">
                  {" "}
                  {dayjs(date).format("DD")}
                </p>
                <span
                  onClick={() => {
                    if (dayjs(date).isBefore(_today, "date")) return;
                    setSelectedDates((_dates) =>
                      _dates.filter((a_date) => a_date !== date)
                    );
                  }}
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
              className="flex-1 flex-grow flex flex-row items-center justify-start gap-1 p-4 rounded-[0.75em] bg-neutral-100 text-neutral-900"
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
              className="flex flex-row items-center justify-between gap-1 p-4 rounded-[0.75em] overflow-hidden bg-blue-500 text-neutral-100"
            >
              <p className="text-[0.7em] font-bold tracking-[0.2em] ">
                {" "}
                SAVE CHANGES
              </p>
              <span className="icon_size material-icons">task_alt</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
