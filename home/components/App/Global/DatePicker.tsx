/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { useState, useRef, useEffect } from "react";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayFullNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MIN_YEAR = new Date(Date.now()).getFullYear();

const DatePicker = ({ onDateChange }: { onDateChange?: (e: any) => void }) => {
  const [showDatepicker, setShowDatepicker] = useState(false);
  const [datepickerValue, setDatepickerValue] = useState("");
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [noOfDays, setNoOfDays] = useState<number[]>([]);
  const [blankdays, setBlankdays] = useState<number[]>([]);
  const dateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initDate();
    getNoOfDays();
  }, []);

  useEffect(() => {
    getNoOfDays();
  }, [month, year]);

  const initDate = () => {
    const today = new Date();
    setMonth(today.getMonth());
    setYear(today.getFullYear());
  };

  const isToday = (date: number): boolean => {
    const today = new Date();
    const d = new Date(year, month, date);
    return today.toDateString() === d.toDateString();
  };

  const isPastDate = (date: number): boolean => {
    const today = new Date();
    const d = new Date(year, month, date);
    return d.getTime() < today.setHours(0, 0, 0, 0); // Compare without time
  };

  const getDateValue = (date: number) => {
    if (isPastDate(date)) return;
    const selectedDate = new Date(year, month, date);
    setDatepickerValue(selectedDate.toDateString());
    if (dateRef.current) {
      dateRef.current.value = `${selectedDate.getFullYear()}-${(
        "0" +
        (selectedDate.getMonth() + 1)
      ).slice(-2)}-${("0" + selectedDate.getDate()).slice(-2)}`;
    }
    console.log(dateRef.current?.value);
    setShowDatepicker(false);
  };

  const getNoOfDays = () => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayOfWeek = new Date(year, month).getDay();

    const blankdaysArray = Array.from({ length: dayOfWeek }, (_, i) => i + 1);
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    setBlankdays(blankdaysArray);
    setNoOfDays(daysArray);
  };

  return (
    <div className="w-full">
      <input
        type="text"
        id="preferredDate"
        name="preferredDate"
        readOnly
        value={datepickerValue}
        onClick={() => setShowDatepicker(true)}
        onKeyDown={(e) => e.key === "Escape" && setShowDatepicker(false)}
        className="w-full cursor-pointer border pl-4 pr-10 py-3 leading-none rounded-lg shadow-sm focus:outline-none focus:shadow-outline text-gray-600 font-medium"
        placeholder="Select Preferred date"
        required
        onChange={onDateChange}
      />

      {showDatepicker && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 md:w-3/5 lg:w-2/5 w-2/3 min-h-[37%]">
            <div className="flex justify-between align-middle items-center m-2 pb-2 border-b">
              <div className="">
                <span className="text-lg font-bold text-gray-800">
                  {MONTH_NAMES[month]}
                </span>
                <span className="ml-1 text-lg text-gray-600 font-normal">
                  {year}
                </span>
              </div>
              <button
                type="button"
                className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-400 dark:hover:text-white"
                data-modal-hide="default-modal"
                onClick={() => setShowDatepicker(false)}
              >
                <svg
                  className="w-3 h-3"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 14 14"
                >
                  <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                  />
                </svg>
                <span className="sr-only">Close modal</span>
              </button>
            </div>
            <div className="flex justify-between items-center mb-2">
              <button
                type="button"
                className={`transition ease-in-out duration-100 inline-flex cursor-pointer hover:bg-gray-200 p-1 rounded-full ${
                  month === 0 &&
                  year === MIN_YEAR &&
                  "cursor-not-allowed opacity-25"
                }`}
                disabled={month === 0 && year === MIN_YEAR}
                onClick={() => {
                  if (month > 0) {
                    setMonth(month - 1);
                  } else {
                    setMonth(11);
                    if (year > MIN_YEAR) {
                      setYear(year - 1);
                    }
                  }
                }}
              >
                <svg
                  className="h-6 w-6 border p-1 rounded-2xl text-gray-500 inline-flex"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <button
                type="button"
                className={`transition ease-in-out duration-100 inline-flex cursor-pointer hover:bg-gray-200 p-1 rounded-full`}
                onClick={() => {
                  if (month < 11) {
                    setMonth(month + 1);
                  } else {
                    setMonth(0);
                    setYear(year + 1);
                  }
                }}
              >
                <svg
                  className="h-6 w-6 border p-1 rounded-2xl text-gray-500 inline-flex"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap mb-3 -mx-1">
              {DAYS.map((day, index) => (
                <div key={index} className="px-1" style={{ width: "14.26%" }}>
                  <div className="text-gray-800 font-medium text-center text-xs">
                    {day}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap -mx-1">
              {blankdays.map((blankday, index) => (
                <div
                  key={index}
                  className="text-center border p-1 border-transparent text-sm"
                  style={{ width: "14.28%" }}
                ></div>
              ))}
              {noOfDays.map((date, dateIndex) => (
                <div
                  key={dateIndex}
                  className="px-1 mb-1"
                  style={{ width: "14.28%" }}
                >
                  <div
                    onClick={() => getDateValue(date)}
                    className={`cursor-pointer text-center text-sm rounded-full leading-loose transition ease-in-out duration-100 ${
                      isToday(date)
                        ? "bg-blue-500 text-white"
                        : isPastDate(date)
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-gray-700 hover:bg-blue-200"
                    }`}
                  >
                    {date}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
