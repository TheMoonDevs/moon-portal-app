import React, { ChangeEvent, useRef } from "react";
import Image from "next/image";
import {
  Checkbox,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Tooltip,
} from "@mui/material";
import DatePicker from "../Members/DatePicker";
import { Button } from "@/components/elements/Button";
import { Textarea } from "@mantine/core";

export const Header: React.FC = () => (
  <div className="flex justify-center items-center space-x-4 md:space-x-6">
    <Image
      src="/logo/logo.png"
      alt="Moon Portal Logo"
      width={80}
      height={80}
      className="w-14 h-14  rounded pointer-events-none"
    />
    <div className="text-black text-2xl font-normal">X</div>
    <Image
      src="/icons/google-calendar.svg"
      alt="Google Calendar Icon"
      width={80}
      height={80}
      className="w-14 h-14 rounded pointer-events-none"
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
          color: "#ddd",
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
      className="text-sm font-medium text-black leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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

export const TitleInput: React.FC<TitleInputProps> = ({ value, onChange, error }) => (
  <div className="mb-4">
    <span
      className={`text-sm font-medium leading-none mt-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
        error ? "text-red-500" : "text-black"
      }`}
      style={{ padding: "0" }}
    >
      {error ? "*Title is Required" : "Title"}
    </span>
    <TextField
      id="title"
      name="title"
      placeholder="Add Title"
      type="text"
      value={value}
      onChange={onChange}
      className="w-full"
    />
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
  <div className="mb-4 w-full">
    <label
      htmlFor="details"
      className="text-sm font-medium mt-1 text-black leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      Details
    </label>
    <Textarea
      id="details"
      name="details"
      placeholder="Add Details"
      value={value}
      onChange={onChange}
      className="w-full"
    />
  </div>
);

//! LocationInput 📍

interface LocationInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export const LocationInput: React.FC<LocationInputProps> = ({ value, onChange }) => (
  <div className="mb-4">
    <label
      htmlFor="location"
      className="text-sm font-medium mt-1  leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      Location
    </label>

    <TextField
      id="location"
      name="location"
      placeholder="Add Location"
      type="text"
      value={value}
      onChange={onChange}
    />
  </div>
);

//! RepeatOptions 🔄
interface RepeatOptionsProps {
  repeatValue: string;
  onRepeatChange: (event: SelectChangeEvent<string>) => void;
  endDateValue: string;
  onEndDateChange: (selectedDate: string) => void;
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
    <div className="mb-4 w-full">
      <div className="flex flex-col md:flex-row justify-between w-full items-center gap-3">
        <div className="w-full">
          <label
            className="text-sm font-medium text-black leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            htmlFor="repeat"
          >
            Repeat
          </label>
          <Select
            value={repeatValue}
            onChange={onRepeatChange}
            displayEmpty
            inputProps={{ "aria-label": "Without label" }}
            className="w-full"
            style={{
              backgroundColor: "white",
              color: "#4A5568",
              fontWeight: "500",
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
          <div className="w-full">
            <label
              className="text-sm font-medium mt-1 text-black leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              htmlFor="endRepeat"
            >
              End Repeat
            </label>
            <DatePicker
              onDateChange={onEndDateChange}
              placeholder="Select end date"
            />
          </div>
        )}
      </div>
    </div>
  );
};

//! TimeInputs ⏰
interface TimeInputsProps {
  startTime?: string;
  onStartTimeChange: (value: string) => void;
  endTime?: string;
  onEndTimeChange: (value: string) => void;
}

export const TimeInputs: React.FC<TimeInputsProps> = ({
  startTime = "11:00",
  onStartTimeChange,
  endTime = "12:00",
  onEndTimeChange,
}) => {
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 w-full">
      <div className="w-full  md:w-1/2">
        <label
          htmlFor="start-time"
          className="text-sm font-medium  text-black leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Start Time
        </label>
        <input
          id="start-time"
          name="start-time"
          type="time"
          value={startTime}
          ref={startTimeRef}
          onClick={() =>
            startTimeRef.current && startTimeRef.current.showPicker()
          }
          onChange={(e) => onStartTimeChange(e.target.value)}
          className="flex h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 no-clock-icon"
        />
      </div>
      <div className="w-full md:w-1/2">
        <label
          htmlFor="end-time"
          className="text-sm font-medium mt-1 text-black leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          End Time
        </label>
        <input
          id="end-time"
          name="end-time"
          type="time"
          value={endTime}
          ref={endTimeRef}
          onClick={() => endTimeRef.current && endTimeRef.current.showPicker()}
          onChange={(e) => onEndTimeChange(e.target.value)}
          className="flex h-10 w-full cursor-pointer  rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 no-clock-icon"
        />
      </div>
    </div>
  );
};

//! SubmitButton 🚀

export const SubmitButton = () => (
  <Tooltip title={"Generate Google Calendar link"} arrow>
    <span>
      <Button type="submit">Generate Link</Button>
    </span>
  </Tooltip>
);
