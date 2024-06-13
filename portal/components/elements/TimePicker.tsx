import * as React from "react";
import { Clock as ClockIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface TimePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const handleTimeChange = (date: Date | null) => {
    onChange(date);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
            !value && "text-gray-400"
          )}
        >
          <span className="flex items-center">
            <ClockIcon className="h-5 w-5 mr-2" />
            {value ? (
              value.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            ) : (
              <span className="text-gray-500">Pick a time</span>
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="p-4 bg-white border border-gray-300 rounded shadow-lg">
          <ReactDatePicker
            selected={value}
            onChange={handleTimeChange}
            showTimeSelect
            showTimeSelectOnly
            timeIntervals={15}
            timeCaption="Time"
            dateFormat="h:mm aa"
            inline
            className="w-full"
            popperClassName="custom-datepicker-popper"
            calendarClassName="custom-datepicker-calendar"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
