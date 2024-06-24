/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { useState, useRef, useEffect } from "react";
import { useAppDispatch } from "@/utils/redux/store";
import { Input } from "@/components/elements/Input";

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

const MIN_YEAR = 1900;
const MAX_YEAR = new Date().getFullYear();

const DatePicker = ({
  onDateChange,
  placeholder,
}: {
  onDateChange?: (e: any) => void;
  placeholder?: string;
}) => {
  const [showDatepicker, setShowDatepicker] = useState(false);
  const [datepickerValue, setDatepickerValue] = useState("");
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [noOfDays, setNoOfDays] = useState<number[]>([]);
  const [blankdays, setBlankdays] = useState<number[]>([]);
  const dateRef = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();

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

  const getDateValue = (date: number) => {
    const selectedDate = new Date(Date.UTC(year, month, date)); // Create a UTC date
    const formattedDate = selectedDate.toISOString(); // Convert to ISO string (UTC)
    const newFormattedDate = new Date(formattedDate)
      .toISOString()
      .split("T")[0];
    setDatepickerValue(newFormattedDate);
    if (dateRef.current) {
      dateRef.current.value = formattedDate; // Set input value to ISO string
    }
    if (onDateChange) {
      onDateChange(selectedDate.toISOString()); // Pass ISO string
    }
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

  const clearDate = () => {
    setDatepickerValue(""); // Clear the datepicker value
    if (dateRef.current) {
      dateRef.current.value = ""; // Clear the input field
    }
    if (onDateChange) {
      onDateChange(""); // Notify the parent component of the cleared date
    }
  };

  return (
    <div className="w-full">
      <Input
        type="text"
        id="dob"
        name="dob"
        readOnly
        value={datepickerValue}
        onClick={() => setShowDatepicker(true)}
        onKeyDown={(e) => e.key === "Escape" && setShowDatepicker(false)}
        className="w-full cursor-pointer border pl-4 pr-10 leading-none rounded-lg shadow-sm focus:outline-none focus:shadow-outline text-gray-600"
        placeholder={placeholder || "Enter Date of Birth"}
        required
        onChange={onDateChange}
      />

      {showDatepicker && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 md:w-3/5 lg:w-2/5 w-2/3 min-h-[37%]">
            <div className="flex justify-between align-middle items-center m-2 pb-2 border-b">
              <div className="">
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="text-lg font-bold text-gray-800 cursor-pointer"
                >
                  {MONTH_NAMES.map((monthName, index) => (
                    <option
                      key={index}
                      value={index}
                      className="cursor-pointer"
                    >
                      {monthName}
                    </option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="ml-1 text-lg text-gray-600 font-normal cursor-pointer"
                >
                  {Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => (
                    <option key={i} value={MIN_YEAR + i}>
                      {MIN_YEAR + i}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="text-black border border-gray-400 w-1/4 items-center ml-4 justify-center bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm h-8 inline-flex "
                onClick={clearDate}
              >
                Clear date
              </button>
              <button
                type="button"
                className="text-gray-400 bg-transparent ml-auto hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-400 dark:hover:text-white"
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
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                  />
                </svg>
                <span className="sr-only">Close modal</span>
              </button>
              {/* Clear button */}
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
