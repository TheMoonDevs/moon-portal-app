"use client";
import { cn } from "@/app/lib/utils";
import Image from "next/image";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import Tooltip from "@mui/material/Tooltip";

import { MenuItem, TextField, Select, Checkbox } from "@mui/material";

interface FormData {
  title: string;
  details: string;
  location: string;
  startDate: Date | null;
  repeat: string;
  startTime: string | Date | null;
  endTime: string | Date | null;
  allDay: boolean;
  endRepeat: Date | null;
  endDate: Date | null;
}

const today = new Date();

const GoogleCalendaCard: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    title: "",
    details: "",
    location: "",
    startDate: null,
    repeat: "no-repeat",
    startTime: null,
    endTime: null,
    allDay: false,
    endRepeat: null,
    endDate: null,
  });

  const [formValidations, setFormValidations] = useState({
    title: undefined as boolean | undefined,
    startDate: undefined as boolean | undefined,
  });
  console.log("formValidations" + formValidations);

  const getWeekdayFromDate = (date: any) => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[date.getDay()];
  };

  useEffect(() => {
    setFormValidations({
      title: false,
      startDate: false,
    });
  }, [formData.title, formData.startDate]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check if either title or startDate is empty
    if (!formData.title || !formData.startDate) {
      setFormValidations({
        title: !formData.title,
        startDate: !formData.startDate,
      });
      return;
    }

    let formattedStartDate: string, formattedEndDate: string;

    if (formData.allDay) {
      const startDate = new Date(formData.startDate);
      startDate.setDate(startDate.getDate() + 1); // Add one day to correct the date issue
      const startDateStr = startDate
        .toISOString()
        .split("T")[0]
        .replace(/-/g, "");
      formattedStartDate = startDateStr;
      formattedEndDate = startDateStr; // For all-day events, start and end date are the same
      console.log("All Day Event: ", formattedStartDate);
    } else {
      const startDate = new Date(formData.startDate);
      startDate.setDate(startDate.getDate());
      if (formData.startTime) {
        if (typeof formData.startTime === "string") {
          const [hours, minutes] = formData.startTime.split(":").map(Number);
          startDate.setHours(hours, minutes);
        } else if (formData.startTime instanceof Date) {
          startDate.setHours(
            formData.startTime.getHours(),
            formData.startTime.getMinutes()
          );
        }
      }

      formattedStartDate =
        startDate.toISOString().replace(/[-:.]/g, "").split(".")[0] + "Z"; // Remove milliseconds and add Z for UTC

      // Calculate the end date based on the end date and time if provided, otherwise default to 2 hours from the start time
      const endDate = formData.endDate
        ? new Date(formData.endDate)
        : new Date(startDate);
      if (formData.endDate) {
        endDate.setDate(endDate.getDate());
      }
      if (formData.endTime) {
        if (typeof formData.endTime === "string") {
          const [hours, minutes] = formData.endTime.split(":").map(Number);
          endDate.setHours(hours, minutes);
        } else if (formData.endTime instanceof Date) {
          endDate.setHours(
            formData.endTime.getHours(),
            formData.endTime.getMinutes()
          );
        }
      } else {
        // Default duration is 2 hours if end time is not provided
        endDate.setTime(startDate.getTime() + 2 * 60 * 60 * 1000); // Add 2 hours
      }

      formattedEndDate =
        endDate.toISOString().replace(/[-:.]/g, "").split(".")[0] + "Z"; // Remove milliseconds and add Z for UTC

      console.log("Timed Event: ", formattedStartDate);
    }

    console.log("Start Date: ", formData.startDate);
    console.log("Formatted Start Date: ", formattedStartDate);
    console.log("Formatted End Date: ", formattedEndDate);

    let recurrence = "";
    if (formData.repeat !== "no-repeat") {
      let freq = "";
      let until = "";
      if (formData.endRepeat) {
        const endRepeat = new Date(formData.endRepeat);
        endRepeat.setHours(23, 59, 59); // Set endRepeat to the end of the day

        // Adjust the end repeat date to account for timezone differences
        const endOffset = endRepeat.getTimezoneOffset();
        endRepeat.setMinutes(endRepeat.getMinutes() - endOffset);

        until = `;UNTIL=${endRepeat
          .toISOString()
          .replace(/[-:]/g, "")
          .slice(0, -5)}Z`;
      }

      switch (formData.repeat) {
        case "daily":
          freq = "DAILY";
          break;
        case "weekly":
          freq = "WEEKLY";
          recurrence = `RRULE:FREQ=${freq};BYDAY=MO${until}`;
          break;
        case "monthly":
          freq = "MONTHLY";
          recurrence = `RRULE:FREQ=${freq};BYDAY=+3MO${until}`;
          break;
        case "annually":
          freq = "YEARLY";
          const startDate = formData.startDate
            ? new Date(formData.startDate)
            : new Date();
          recurrence = `RRULE:FREQ=${freq};BYMONTH=${
            startDate.getMonth() + 1
          };BYMONTHDAY=${startDate.getDate()}${until}`;
          break;
        case "every-weekday":
          freq = "WEEKLY";
          recurrence = `RRULE:FREQ=${freq};BYDAY=MO,TU,WE,TH,FR${until}`;
          break;
        default:
          freq = formData.repeat.toUpperCase();
      }

      if (!recurrence) {
        recurrence = `RRULE:FREQ=${freq}${until}`;
      }
    }

    // Build the Google Calendar URL with only non-empty fields 🔗
    let googleCalendarLink = `https://calendar.google.com/calendar/u/0/r/eventedit?text=${encodeURIComponent(
      formData.title
    )}&dates=${formattedStartDate}/${formattedEndDate}`;

    if (formData.details) {
      googleCalendarLink += `&details=${encodeURIComponent(formData.details)}`;
    }
    if (formData.location) {
      googleCalendarLink += `&location=${encodeURIComponent(
        formData.location
      )}`;
    }
    if (recurrence) {
      googleCalendarLink += `&recur=${encodeURIComponent(recurrence)}`;
    }

    setFormValidations({
      title: false,
      startDate: false,
    });

    setFormData({
      title: "",
      details: "",
      location: "",
      startDate: null,
      repeat: "no-repeat",
      startTime: null,
      endTime: null,
      allDay: false,
      endRepeat: null,
      endDate: null,
    });

    window.open(googleCalendarLink, "_blank");
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleDateChange = (name: keyof FormData) => (date: Date | null) => {
    if (date) {
      date.setHours(0, 0, 0, 0); // Ensure the date is set to the start of the day
    }
    setFormData((prevData) => ({
      ...prevData,
      [name]: date || today,
    }));
  };

  const handleTimeChange = (name: keyof FormData) => (time: Date | null) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: time,
    }));
  };

  const handleSelectChange = (event: any) => {
    setFormData((prevData) => ({
      ...prevData,
      repeat: event.target.value,
    }));
  };

  const toggleAllDay = () => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      allDay: !prevFormData.allDay,
    }));
  };

  const getTodayDateString = () => {
    const today = new Date();
    return format(today, "yyyy-MM-dd");
  };
  return (
    <div className="max-w-md w-full mx-auto rounded-none md:rounded-2xl mb-5 p-4 md:p-8 shadow-input bg-black/90">
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

      <h2 className="font-bold mt-3 text-center text-xl text-white">
        Invite Link Generator
      </h2>
      <div className="bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent my-3 h-[1px] w-full" />

      <form className="my-3" onSubmit={handleSubmit}>
        <div className="flex justify-end items-center">
          <Tooltip title={"Set Task All Day"} arrow>
            <Checkbox
              checked={formData.allDay}
              onChange={toggleAllDay}
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

        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mb-4">
          <LabelInputContainer>
            <label htmlFor="title">
              {formValidations.title ? (
                <span className="text-red-500 font-bold">
                  *Title is Required
                </span>
              ) : (
                <span className="text-sm font-medium mt-1 text-white leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Title
                </span>
              )}
            </label>
            <input
              id="title"
              name="title"
              placeholder="Add Title"
              type="text"
              className="flex h-10 w-full bg-gray-100 font-bold text-gray-700 shadow-input rounded-md px-3 py-2 text-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 transition duration-400"
              value={formData.title}
              onChange={handleInputChange}
            />
          </LabelInputContainer>
          <LabelInputContainer className="mb-4">
            <label
              htmlFor="details"
              className="text-sm  font-medium mt-1 text-white leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Details
            </label>
            <textarea
              id="details"
              className="flex min-h-[60px] w-full rounded-md border border-input bg-gray-100 text-gray-700 font-bold px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              name="details"
              placeholder="Add Details"
              value={formData.details}
              onChange={handleInputChange}
            />
          </LabelInputContainer>
        </div>
      </form>
    </div>
  );
};
export default GoogleCalendaCard;

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex flex-col space-y-2 w-full", className)}>
      {children}
    </div>
  );
};
