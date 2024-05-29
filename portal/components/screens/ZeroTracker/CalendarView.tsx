import React from "react";
import dayjs from "dayjs";
import { useAppSelector } from "@/utils/redux/store";

interface CalendarViewProps {
  currentMonthDayjs: dayjs.Dayjs;
  trackerMode: string;
  zeroRecord: any;
  selectedDates: string[];
  meetingDate: string;
  setSelectedDates: React.Dispatch<React.SetStateAction<string[]>>;
  setTrackerMode: React.Dispatch<
    React.SetStateAction<"leave" | "zero" | "meeting" | "normal" | "extra">
  >;
  setMeetingDate: React.Dispatch<React.SetStateAction<any>>;
}

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CalendarView: React.FC<CalendarViewProps> = ({
  currentMonthDayjs,
  trackerMode,
  zeroRecord,
  selectedDates,
  setSelectedDates,
  setTrackerMode,
  meetingDate,
  setMeetingDate,
}) => {
  const today = new Date();
  const _today = currentMonthDayjs;
  const lastDayOfPrevMonth = _today.subtract(1, "month").endOf("month").date();
  const firstDayOfThisMonth = _today.startOf("month").day();
  const lastDayOfThisMonth = _today.endOf("month").day();
  const loggedInUserMeetingRecord = useAppSelector(
    (state) => state.zerotracker.loggedInUserMeetingRecord
  );
  return (
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
            const date = currentMonthDayjs.date(
              lastDayOfPrevMonth - firstDayOfThisMonth + index + 1
            );
            return (
              <div
                key={index}
                className="p-3 text-sm text-uppercase tracking-[0.1em] text-neutral-200"
              >
                <span>{date.format("D")}</span>
              </div>
            );
          })}
          {Array.from({ length: currentMonthDayjs.daysInMonth() }).map(
            (_, index) => {
              const date = currentMonthDayjs.date(index + 1);
              const isToday = date.isSame(today, "date");
              const isWeekEnds = date.day() === 0 || date.day() === 6;
              const dateFromRecords = zeroRecord?.allZeros?.find(
                (a_zero: any) => a_zero.date === date.format("YYYY-MM-DD")
              );
              const dateFromMeeting =
                loggedInUserMeetingRecord?.allMeetings?.find(
                  (a_meeting: any) =>
                    a_meeting.date === date.format("YYYY-MM-DD")
                );
              let isClickDisabled =
                (trackerMode === "leave" || trackerMode === "zero") &&
                isWeekEnds;
              if (!isClickDisabled)
                isClickDisabled =
                  (trackerMode === "leave" || trackerMode === "zero") &&
                  date.isBefore(_today, "date");
              return (
                <div
                  key={index}
                  className={`relative p-3 text-sm text-uppercase tracking-[0.1em] flex items-center justify-center cursor-pointer ${
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
                    if (trackerMode === "meeting") {
                      if (meetingDate === date.format("YYYY-MM-DD"))
                        setMeetingDate("");
                      else setMeetingDate(date.format("YYYY-MM-DD"));
                    }
                  }}
                >
                  {trackerMode !== "normal" &&
                    selectedDates.includes(date.format("YYYY-MM-DD")) && (
                      <span
                        className={`border border-${
                          trackerMode === "leave"
                            ? "red"
                            : trackerMode === "zero"
                            ? "blue"
                            : trackerMode === "meeting"
                            ? "red"
                            : "unkown"
                        }-500 rounded-full absolute top-0 bottom-0 w-full h-full`}
                      ></span>
                    )}
                  <span
                    className={`${isClickDisabled ? "text-neutral-200" : ""}`}
                  >
                    {date.format("D")}
                  </span>
                  {(dateFromRecords || dateFromMeeting) &&
                    trackerMode === "normal" && (
                      <span
                        className={`${
                          dateFromRecords?.type === "zero"
                            ? "bg-blue-500"
                            : dateFromRecords?.type === "leave"
                            ? "bg-red-500"
                            : dateFromMeeting.type === "meeting"
                            ? "bg-red-500"
                            : "bg-neutral-200"
                        } absolute top-1 right-[40%] w-2 h-2 rounded-full`}
                      ></span>
                    )}
                  {dateFromRecords && trackerMode === "zero" && (
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
                  {dateFromMeeting && trackerMode === "meeting" && (
                    <span
                      className={`bg-red-500 absolute top-1 right-[40%] w-2 h-2 rounded-full`}
                    ></span>
                  )}

                  {meetingDate === date.format("YYYY-MM-DD") &&
                    trackerMode === "meeting" && (
                      <span className="bg-red-500 absolute top-1 right-[40%] w-2 h-2 rounded-full"></span>
                    )}
                </div>
              );
            }
          )}
          {Array.from({ length: 7 - (lastDayOfThisMonth + 1) }).map(
            (_, index) => {
              const date = currentMonthDayjs.date(index + 1);
              return (
                <div
                  key={index}
                  className="p-3 text-sm text-uppercase tracking-[0.1em] text-neutral-200"
                >
                  <span>{date.format("D")}</span>
                </div>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
