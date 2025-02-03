import { Textarea } from '@mantine/core';
import type { SelectChangeEvent } from '@mui/material';
import { Checkbox, MenuItem, Select, TextField, Tooltip } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Image from 'next/image';
import type { ChangeEvent } from 'react';
import React, { useRef } from 'react';

import { Button } from '@/components/elements/Button';

export const Header: React.FC = () => (
  <div className="flex items-center justify-center space-x-4 md:space-x-6">
    <Image
      src="/logo/logo.png"
      alt="Moon Portal Logo"
      width={80}
      height={80}
      className="pointer-events-none size-14 rounded"
    />
    <div className="text-2xl font-normal text-black">X</div>
    <Image
      src="/icons/google-calendar.svg"
      alt="Google Calendar Icon"
      width={80}
      height={80}
      className="pointer-events-none size-14 rounded"
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
  <div className="flex h-5 items-center justify-end">
    <Tooltip title={'Set Task All Day'} arrow>
      <Checkbox
        checked={checked}
        onChange={onChange}
        sx={{
          color: '#ddd',
          '&.Mui-checked': {
            color: '#0096FF',
          },
          '& .MuiSvgIcon-root': {
            width: '1.2em',
            height: '1.2em',
          },
        }}
      />
    </Tooltip>
    <label
      className="text-sm font-medium leading-none text-black peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      htmlFor="allDay"
    >
      All Day
    </label>
  </div>
);

//! Title TextField ✍️

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
  <div className="mb-4 flex w-full flex-col">
    <span
      className={`mb-2 text-sm font-semibold leading-none ${
        error ? 'text-red-500' : 'text-gray-700'
      }`}
    >
      {error ? '*Title is Required' : '*Title'}
    </span>
    <TextField
      type="text"
      id="title"
      size="small"
      name="title"
      color="info"
      placeholder="Add Title"
      variant="outlined"
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
      className="mt-1 text-sm font-medium leading-none text-black peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      Details
    </label>
    <Textarea
      id="details"
      name="details"
      placeholder="Add Details"
      value={value}
      onChange={onChange}
      minRows={6}
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
  <div className="mb-4 flex w-full flex-col">
    <span className={`mb-2 text-sm font-semibold leading-none text-gray-700`}>
      Location
    </span>
    <TextField
      type="text"
      id="location"
      size="small"
      name="location"
      color="info"
      placeholder="Add Location"
      variant="outlined"
      value={value}
      onChange={onChange}
      className="w-full"
    />
  </div>
);

//! Start Date 📅
interface DatePickerProps {
  onDateChange: (selectedDate: Date | null) => void; // Adjust the type of onDateChange
  value: Date | null; // Adjust the type of value
  error: boolean;
}

export const StartDatePicker: React.FC<DatePickerProps> = ({
  onDateChange,
  value,
  error,
}) => {
  return (
    <div className="mb-4 flex w-full flex-col">
      <span
        className={`mb-2 mt-4 text-sm font-semibold leading-none md:mt-0 ${
          error ? 'text-red-500' : 'text-gray-700'
        }`}
      >
        {error ? '*Start Date is Required' : '*Start Date'}
      </span>
      <DatePicker
        slotProps={{
          textField: {
            size: 'small',
            variant: 'outlined',
            color: 'info',
          },
        }}
        className="w-full border-black"
        value={value}
        onChange={onDateChange}
      />
    </div>
  );
};

//! RepeatOptions 🔄
interface RepeatOptionsProps {
  repeatValue: string;
  onRepeatChange: (event: SelectChangeEvent<string>) => void;
  endDateValue: string;
  onEndDateChange: any;
  startDate: string | null; // Assume startDate is passed as a prop
}

const getWeekdayFromDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
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
      <div className="flex w-full flex-col items-center justify-between gap-3 md:flex-row">
        <div className="mb-4 flex w-full flex-col md:mb-0">
          <span className="mb-2 text-sm font-semibold leading-none text-gray-700">
            Repeat
          </span>
          <Select
            value={repeatValue}
            onChange={onRepeatChange}
            displayEmpty
            inputProps={{ 'aria-label': 'Without label' }}
            className="w-full"
            style={{
              backgroundColor: 'white',
              color: '#4A5568',
              fontWeight: '500',
              height: '40px',
              borderRadius: '4px',
              fontSize: '14px',
              paddingRight: '30px',
            }}
            MenuProps={{
              PaperProps: {
                style: {
                  backgroundColor: 'white',
                  color: '#4A5568',
                },
              },
            }}
            renderValue={(selected) => (
              <span style={{ color: selected ? '#4A5568' : '#BCCCDC' }}>
                {selected || 'Select'}
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
              Annually on{' '}
              {new Intl.DateTimeFormat('en-US', {
                month: 'long',
                day: 'numeric',
              }).format(startDateValue)}
            </MenuItem>
            <MenuItem value="every-weekday">Weekly on Weekdays</MenuItem>
          </Select>
        </div>

        {repeatValue !== 'no-repeat' && (
          <div className="mb-4 flex w-full flex-col md:mb-0">
            <span className="mb-2 text-sm font-semibold leading-none text-gray-700">
              End Repeat
            </span>
            <DatePicker
              slotProps={{
                textField: {
                  size: 'small',
                  variant: 'outlined',
                  color: 'primary',
                  InputProps: {
                    style: {
                      borderColor: 'black', // Ensure black border
                      backgroundColor: 'transparent', // Ensure no conflicting background color
                    },
                    classes: {
                      root: 'customDatePickerRoot', // Apply a custom class to ensure specificity
                      error: 'customDatePickerError', // Apply a class to override error state if needed
                    },
                  },
                },
              }}
              value={endDateValue}
              onChange={onEndDateChange}
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
  startTime = '11:00',
  onStartTimeChange,
  endTime = '12:00',
  onEndTimeChange,
}) => {
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex w-full flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
      <div className="w-full md:w-1/2">
        <label
          htmlFor="start-time"
          className="text-sm font-medium leading-none text-black peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring no-clock-icon flex h-10 w-full cursor-pointer rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <div className="w-full md:w-1/2">
        <label
          htmlFor="end-time"
          className="mt-1 text-sm font-medium leading-none text-black peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring no-clock-icon flex h-10 w-full cursor-pointer rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
    </div>
  );
};

//! SubmitButton 🚀

export const SubmitButton = () => (
  <Tooltip title={'Generate Google Calendar link'} arrow>
    <span>
      <Button type="submit">Generate Link</Button>
    </span>
  </Tooltip>
);
