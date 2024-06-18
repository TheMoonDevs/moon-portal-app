import React, { ChangeEvent } from "react";
import Image from "next/image";
import { Checkbox, MenuItem, Select, SelectChangeEvent, TextField, Tooltip } from "@mui/material";

export const Header: React.FC = () => (
  <div className="flex justify-center items-center space-x-4 md:space-x-6">
    <Image
      src="/logo/logo_white.png"
      alt="Moon Portal Logo"
      width={40}
      height={40}
      className="w-12 h-12 rounded pointer-events-none"
    />
    <div className="text-white text-2xl font-normal">X</div>
    <Image
      src="/icons/google-calendar.svg"
      alt="Google Calendar Icon"
      width={40}
      height={40}
      className="w-12 h-12 rounded pointer-events-none"
    />
  </div>
);

//! AllDayCheckbox ✅

interface AllDayCheckboxProps {
  checked: boolean;
  onChange: () => void;
}

export const AllDayCheckbox: React.FC<AllDayCheckboxProps> = ({
  checked,
  onChange,
}) => (
  <div className="flex justify-end items-center h-5">
    <Tooltip title={"Set Task All Day"} arrow>
      <Checkbox
        checked={checked}
        onChange={onChange}
        sx={{
          color: "#fff",
          "&.Mui-checked": {
            color: "#0096FF",
          },
          "& .MuiSvgIcon-root": {
            width: "1.2em",
            height: "1.2em",
          },
        }}
      />
    </Tooltip>
    <label
      className="text-sm font-medium text-white leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      htmlFor="allDay"
    >
      All Day
    </label>
  </div>
);

//! TitleInput ✍️

interface TitleInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error: boolean;
}

export const TitleInput: React.FC<TitleInputProps> = ({
  value,
  onChange,
  error,
}) => (
  <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mb-4">
    <div className="w-full">
      <span
        className={`text-sm font-medium leading-none mt-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
          error ? "text-red-500" : "text-white"
        }`}
        style={{ padding: "0" }}
      >
        {error ? "*Title is Required" : "Title"}
      </span>
      <input
        id="title"
        name="title"
        placeholder="Add Title"
        type="text"
        className="flex h-10 w-full bg-gray-100 font-bold text-gray-700 shadow-input rounded-md px-3 py-2 text-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 transition duration-400"
        value={value}
        onChange={onChange}
      />
    </div>
  </div>
);

//! DetailsInput ✍️
interface DetailsInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}

export const DetailsInput: React.FC<DetailsInputProps> = ({
  value,
  onChange,
}) => (
  <div className="mb-4">
    <label
      htmlFor="details"
      className="text-sm font-medium mt-1 text-white leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      Details
    </label>
    <textarea
      id="details"
      className="flex min-h-[60px] w-full rounded-md border border-input bg-gray-100 text-gray-700 font-bold px-3 py-2 text-sm shadow-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      name="details"
      placeholder="Add Details"
      value={value}
      onChange={onChange}
    />
  </div>
);

//! LocationInput 📍

interface LocationInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  value,
  onChange,
}) => (
  <div className="mb-4">
    <label
      htmlFor="location"
      className="text-sm font-medium mt-1 text-white leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      Location
    </label>
    <input
      id="location"
      name="location"
      placeholder="Add Location"
      type="text"
      className="flex h-10 w-full bg-gray-100 font-bold text-gray-700 shadow-input rounded-md px-3 py-2 text-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 transition duration-400"
      value={value}
      onChange={onChange}
    />
  </div>
);

//! DateInput 📅

interface DateInputProps {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: boolean;
}

export const DateInput: React.FC<DateInputProps> = ({
  label,
  value,
  onChange,
  error = false,
}) => (
  <div className="flex flex-col mb-4">
    <label
      className={`text-sm font-medium mt-1 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
        error ? "text-red-500" : "text-white"
      }`}
      htmlFor="date-input"
    >
      {error ? `*${label} is Required` : label}
    </label>
    <TextField
      id="date-input"
      type="date"
      value={value}
      onChange={onChange}
      InputLabelProps={{
        shrink: true,
      }}
      placeholder="Select date"
      onFocus={(e) => {
        if (!value) {
          e.target.value = new Date().toISOString().split("T")[0];
        }
      }}
      InputProps={{
        style: {
          backgroundColor: "white",
          color: "#4A5568",
          fontWeight: "bold",
          width: "100%",
          height: "40px",
          borderRadius: "4px",
          fontSize: "14px",
        },
      }}
      variant="outlined"
      className="mt-2"
    />
  </div>
);

//! RepeatOptions 🔄

interface RepeatOptionsProps {
  repeatValue: string;
  onRepeatChange: (event: SelectChangeEvent<string>) => void;
  endDateValue: string;
  onEndDateChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  startDate: string | null; // Assume startDate is passed as a prop
}

const getWeekdayFromDate = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
};

const today = new Date();

export const RepeatOptions: React.FC<RepeatOptionsProps> = ({
  repeatValue,
  onRepeatChange,
  endDateValue,
  onEndDateChange,
  startDate,
}) => {
  const startDateValue = startDate ? new Date(startDate) : today;


  return (
    <div className="mb-4">
      <div className="flex justify-between w-full items-center gap-3">
        <div className="w-full">
          <label
            className="text-sm font-medium text-white leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            htmlFor="repeat"
          >
            Repeat
          </label>
          <Select
            value={repeatValue}
            onChange={onRepeatChange}
            displayEmpty
            inputProps={{ "aria-label": "Without label" }}
            style={{
              backgroundColor: "white",
              color: "#4A5568",
              fontWeight: "bold",
              width: "100%",
              height: "40px",
              borderRadius: "4px",
              fontSize: "14px",
              paddingRight: "30px",
            }}
            MenuProps={{
              PaperProps: {
                style: {
                  backgroundColor: "white",
                  color: "#4A5568",
                },
              },
            }}
            renderValue={(selected) => (
              <span style={{ color: selected ? "#4A5568" : "#BCCCDC" }}>
                {selected || "Select"}
              </span>
            )}
          >
            <MenuItem value="no-repeat">Doesn&apos;t repeat</MenuItem>
            <MenuItem value="daily">Daily</MenuItem>
            <MenuItem value="weekly">
              Weekly on {getWeekdayFromDate(startDateValue)}
            </MenuItem>
            <MenuItem value="monthly">
              Monthly on the third {getWeekdayFromDate(startDateValue)}
            </MenuItem>
            <MenuItem value="annually">
              Annually on{" "}
              {new Intl.DateTimeFormat("en-US", {
                month: "long",
                day: "numeric",
              }).format(startDateValue)}
            </MenuItem>
            <MenuItem value="every-weekday">Weekly on Weekdays</MenuItem>
          </Select>
        </div>

        {repeatValue !== "no-repeat" && (
          <div className="w-1/2">
            <label
              className="text-sm font-medium mt-1 text-white leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              htmlFor="endRepeat"
            >
              End Repeat
            </label>
            <TextField
              id="end-date-picker"
              type="date"
              value={endDateValue}
              onChange={onEndDateChange}
              InputLabelProps={{
                shrink: true,
              }}
              placeholder="Select date"
              onFocus={(e) => {
                if (!endDateValue) {
                  e.target.value = new Date().toISOString().split("T")[0];
                }
              }}
              InputProps={{
                style: {
                  backgroundColor: "white",
                  color: "#4A5568",
                  fontWeight: "bold",
                  width: "100%",
                  height: "40px",
                  borderRadius: "4px",
                  fontSize: "14px",
                },
              }}
              variant="outlined"
            />
          </div>
        )}
      </div>
    </div>
  );
};

//! TimeInput ⏰

interface TimeInputsProps {
  startTime: string;
  onStartTimeChange: (value: string) => void;
  endTime: string;
  onEndTimeChange: (value: string) => void;
}

export const TimeInputs: React.FC<TimeInputsProps> = ({
  startTime = "11:00", 
  onStartTimeChange,
  endTime = "12:00", 
  onEndTimeChange,
}) => (
  <div className="flex justify-between gap-4">
    <div className="w-1/2">
      <label
        htmlFor="start-time"
        className="text-sm font-medium mt-1 text-white leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Start Time
      </label>
      <input
        id="start-time"
        name="start-time"
        type="time"
        value={startTime}
        onChange={(e) => onStartTimeChange(e.target.value)}
        className="block w-full h-10 bg-gray-100 font-bold text-gray-700 shadow-sm rounded-md px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
    <div className="w-1/2">
      <label
        htmlFor="end-time"
        className="text-sm font-medium mt-1 text-white leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        End Time
      </label>
      <input
        id="end-time"
        name="end-time"
        type="time"
        value={endTime}
        onChange={(e) => onEndTimeChange(e.target.value)}
        className="block w-full h-10 bg-gray-100 font-bold text-gray-700 shadow-sm rounded-md px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  </div>
);


//! SubmitButton 🚀

export const SubmitButton = () => (
  <Tooltip title={"Generate Google Calendar link"} arrow>
    <button
      className="cool-button bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 mt-3 relative block w-full text-white rounded-md h-12 font-semibold shadow-lg transition duration-300 ease-in-out hover:bg-gradient-to-r hover:from-blue-700 hover:via-blue-600 hover:to-blue-800"
      type="submit"
    >
      Generate Link &rarr;
    </button>
  </Tooltip>
);
