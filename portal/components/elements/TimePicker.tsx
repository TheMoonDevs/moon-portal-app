"use client";

import * as React from "react";
import { Clock as ClockIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TimePicker as MuiTimePicker } from "@mui/x-date-pickers/TimePicker";
import TextField from "@mui/material/TextField";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers";

export function TimePicker() {
  const [time, setTime] = React.useState<Date | null>(null);

  const handleTimeChange = (newTime: Date | null) => {
    setTime(newTime);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "justify-start text-left font-normal w-full bg-white text-black",
              !time && "text-muted-foreground"
            )}
          >
            <ClockIcon className="mr-2 h-4 w-4 text-gray-500" />
            {time ? (
              time.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            ) : (
              <span>Pick a time</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <div className="p-4 bg-white">
            <MuiTimePicker
              value={time}
              onChange={handleTimeChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  InputProps={{
                    style: {
                      backgroundColor: "white",
                      color: "black",
                    },
                  }}
                />
              )}
            />
          </div>
        </PopoverContent>
      </Popover>
    </LocalizationProvider>
  );
}
