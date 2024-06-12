"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  selectedDate: Date | null;
  onDateChange?: (date: Date | null) => void;
}

export function DatePicker({ selectedDate, onDateChange }: DatePickerProps) {
  const [date, setDate] = React.useState<Date | null>(null);

  React.useEffect(() => {
    // Fetch the date from local storage on component mount
    const storedDate = localStorage.getItem("selectedDate");
    if (storedDate) {
      setDate(new Date(storedDate));
    }
  }, []);

  React.useEffect(() => {
    // If no date is selected, remove the stored date
    if (!date) {
      localStorage.removeItem("selectedDate");
    }
  }, [date]);

  const handleDateChange = (newDate: Date | undefined) => {
    const updatedDate = newDate || null;
    setDate(updatedDate);
    if (updatedDate) {
      localStorage.setItem("selectedDate", updatedDate.toISOString());
    }
    if (onDateChange && typeof onDateChange === "function") {
      onDateChange(updatedDate);
    }
  };

  React.useEffect(() => {
    // When selectedDate changes, update the local state
    setDate(selectedDate);
  }, [selectedDate]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "justify-start text-left font-normal w-full",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date || undefined}
          onSelect={handleDateChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
