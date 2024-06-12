"use client";
import { Label } from "../../components/elements/Label";
import { Input } from "../../components/elements/Input";
import { cn } from "@/utils/cn";
import Link from "next/link";
import { PageAccess } from "@/components/global/PageAccess";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import Image from "next/image";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/elements/DatePicker";
import { TimePicker } from "@/components/elements/TimePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useState } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormData {
  title: string;
  details: string;
  location: string;
  startDate: Date | null;
  repeat: string;
  startTime: string | Date | null; // Modified
  endTime: string | Date | null; // Modified
  allDay: boolean;
  endRepeat: Date | null;
  endDate: Date | null; // Added
}

const GoogleCalendar: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    title: "",
    details: "",
    location: "",
    startDate: null,
    repeat: "no-repeat",
    startTime: null,
    endTime: null,
    allDay: true,
    endRepeat: null,
    endDate: null,
  });

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

  const today = new Date();


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.startDate) {
      alert("Please fill in all required fields.");
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
      startDate.setDate(startDate.getDate() + 1); // Add one day to correct the date issue
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
        endDate.setDate(endDate.getDate() + 1); // Add one day to correct the date issue
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

    const googleCalendarLink = `https://calendar.google.com/calendar/u/0/r/eventedit?text=${encodeURIComponent(
      formData.title
    )}&dates=${formattedStartDate}/${formattedEndDate}&details=${encodeURIComponent(
      formData.details
    )}&location=${encodeURIComponent(
      formData.location
    )}&recur=${encodeURIComponent(recurrence)}`;

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

 const handleSelectChange = (value: any) => {
   setFormData((prevData) => ({
     ...prevData,
     repeat: value,
   }));
 };

  const toggleAllDay = () => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      allDay: !prevFormData.allDay,
    }));
  };

  return (
    <div className="w-full min-h-screen bg-neutral-900 flex flex-col justify-between">
      <PageAccess isAuthRequired={true}>
        <Link
          href={APP_ROUTES.home}
          className="cursor-pointer invert rounded-lg p-2 pt-3 flex items-center gap-2 text-neutral-900 hover:text-neutral-700"
        >
          <span className="icon_size material-icons">arrow_back</span>
          <h1 className="uppercase tracking-[0.2em] font-mono text-xl">Back</h1>
        </Link>
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
            <LabelInputContainer>
              <div className="flex justify-end gap-3">
                <Switch
                  checked={formData.allDay}
                  onCheckedChange={toggleAllDay}
                />
                <Label htmlFor="allDay">All Day</Label>
              </div>
            </LabelInputContainer>

            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mb-4">
              <LabelInputContainer>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Add Title"
                  type="text"
                  value={formData.title}
                  onChange={handleInputChange}
                />
              </LabelInputContainer>
            </div>
            <LabelInputContainer className="mb-4">
              <Label htmlFor="details">Details</Label>
              <Textarea
                id="details"
                name="details"
                placeholder="Add Details"
                value={formData.details}
                onChange={handleInputChange}
              />
            </LabelInputContainer>
            <LabelInputContainer>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                placeholder="Add Location"
                type="text"
                value={formData.location}
                onChange={handleInputChange}
              />
            </LabelInputContainer>

            <LabelInputContainer className="mb-4">
              <Label htmlFor="startDate">Start Date</Label>
              <DatePicker
                selectedDate={formData.startDate}
                onDateChange={handleDateChange("startDate")}
              />
            </LabelInputContainer>

            <LabelInputContainer>
              <div className="flex justify-between items-center gap-3">
                <div
                  className={`w-${
                    formData.repeat === "no-repeat" ? "[100%]" : "[50%]"
                  }`}
                >
                  <Label htmlFor="repeat">Repeat</Label>
                  <Select
                    value={formData.repeat}
                    onValueChange={handleSelectChange}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder="Doesn't repeat"
                        className="text-gray-500 font-semibold"
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-repeat">
                        Doesn&apos;t repeat
                      </SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">
                        Weekly on{" "}
                        {getWeekdayFromDate(
                          new Date(formData.startDate || today)
                        )}
                      </SelectItem>
                      <SelectItem value="monthly">
                        Monthly on the third{" "}
                        {getWeekdayFromDate(
                          new Date(formData.startDate || today)
                        )}
                      </SelectItem>
                      <SelectItem value="annually">
                        Annually on{" "}
                        {format(
                          new Date(formData.startDate || today),
                          "MMMM d"
                        )}
                      </SelectItem>
                      <SelectItem value="every-weekday">
                        Weekly on Weekdays{" "}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.repeat !== "no-repeat" && (
                  <div className="w-[50%]">
                    <Label htmlFor="endRepeat">End Repeat</Label>
                    <DatePicker
                      selectedDate={formData.endRepeat || today} // Set default date
                      onDateChange={handleDateChange("endRepeat")}
                    />
                  </div>
                )}
              </div>
            </LabelInputContainer>

            {!formData.allDay && (
              <div className="flex justify-between item-center gap-3">
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <div className="w-[50%]">
                    <Label>Start Time</Label>
                    <TimePicker
                      value={formData.startTime as Date | null}
                      onChange={handleTimeChange("startTime")}
                    />
                  </div>
                  <div className="w-[50%]">
                    <Label>End Time</Label>
                    <TimePicker
                      value={formData.endTime as Date | null}
                      onChange={handleTimeChange("endTime")}
                    />
                  </div>
                </LocalizationProvider>
              </div>
            )}

            <button
              className="bg-gradient-to-br mt-3 relative group/btn from-black dark:from-zinc-900 dark:to-zinc-900 to-neutral-600 block dark:bg-zinc-800 w-full text-white rounded-md h-10 font-medium shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:shadow-[0px_1px_0px_0px_var(--zinc-800)_inset,0px_-1px_0px_0px_var(--zinc-800)_inset] transition duration-300 ease-in-out hover:from-black hover:to-neutral-700"
              type="submit"
            >
              Generate Link &rarr;
              <BottomGradient />
            </button>

            <div className="bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent h-[1px] w-full" />
          </form>
        </div>
      </PageAccess>
    </div>
  );
};
export default GoogleCalendar;

const BottomGradient = () => {
  return (
    <>
      <span className="block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent glow-blue" />
      <span className="block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-indigo-500 to-transparent glow-blue" />
    </>
  );
};

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
