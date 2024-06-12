"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar"; // Adjusted import

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
  const [date, setDate] = React.useState<Date | null>(selectedDate || null);

  const handleDateChange = (newDate: Date | undefined) => {
    // Adjusted handler type
    const updatedDate = newDate || null;
    setDate(updatedDate);
    if (onDateChange && typeof onDateChange === "function") {
      onDateChange(updatedDate);
    }
  };

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
