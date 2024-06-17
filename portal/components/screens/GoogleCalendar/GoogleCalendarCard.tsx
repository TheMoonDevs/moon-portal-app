"use client";

import Image from "next/image";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import Tooltip from "@mui/material/Tooltip";

import { MenuItem, TextField, Select, Checkbox } from "@mui/material";
import LabelInputContainer from "./LabelInputContainer";
import {
  validateForm,
  buildGoogleCalendarURL,
  formatDates,
  generateRecurrenceRule,
  FormDataType,
} from "./GoogleCalendarUtils";

export interface FormData {
  title: string;
  details: string;
  location: string;
  startDate: Date | null;
  repeat: string;
  startTime: any;
  endTime: any;
  allDay: boolean;
  endRepeat: Date | null;
  endDate: Date | null;
}

const today = new Date();

const GoogleCalendaCard: React.FC = () => {
  const [formData, setFormData] = useState<FormDataType>({
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
    title: false,
    startDate: false,
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

  //! 📝 Handle form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate the form data 📝
    const validations = validateForm(formData);
    if (validations.title || validations.startDate) {
      setFormValidations(validations);
      return;
    }

    // Format the start and end dates 📅
    const { startDate, endDate } = formatDates(formData);

    // Generate the recurrence rule 🔄
    const recurrence = generateRecurrenceRule(formData);

    // Build the Google Calendar URL 🔗
    const googleCalendarLink = buildGoogleCalendarURL(
      formData,
      startDate,
      endDate,
      recurrence
    );

    // Reset the form after submission 🔄
    setFormValidations({ title: false, startDate: false });
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

    // Open the Google Calendar event in a new tab 🌐
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

  const handleTimeChange =
    (name: keyof FormData) => (time: Date | string | null) => {
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
        <div className="flex justify-end items-center h-5 ">
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
            <span
              className={`text-sm font-medium leading-none mt-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                formValidations.startDate ? "text-red-500" : "text-white"
              }`}
              style={{ padding: "0" }}
            >
              {formValidations.startDate ? "*Title is Required" : "Title"}
            </span>
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
        </div>
        <LabelInputContainer className="mb-4">
          <label
            htmlFor="details"
            className="text-sm  font-medium mt-1 text-white leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Details
          </label>
          <textarea
            id="details"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-gray-100 text-gray-700 font-bold px-3 py-2 text-sm shadow-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            name="details"
            placeholder="Add Details"
            value={formData.details}
            onChange={handleInputChange}
          />
        </LabelInputContainer>
        <LabelInputContainer>
          <label
            className="
                text-sm
                font-medium
                mt-1
                text-white
                leading-none
                peer-disabled:cursor-not-allowed
                peer-disabled:opacity-70"
            htmlFor="location"
          >
            Location
          </label>
          <input
            id="location"
            name="location"
            placeholder="Add Location"
            type="text"
            className="flex h-10 w-full bg-gray-100 font-bold text-gray-700 shadow-input rounded-md px-3 py-2 text-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 transition duration-400"
            value={formData.location ?? ""}
            onChange={handleInputChange}
          />
        </LabelInputContainer>
        <LabelInputContainer className="my-2">
          <span
            className={`text-sm font-medium leading-none mt-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
              formValidations.startDate ? "text-red-500" : "text-white"
            }`}
            style={{ padding: "0" }}
          >
            {formValidations.startDate
              ? "*Start Date is Required"
              : "Start Date"}
          </span>

          <TextField
            id="mui-date-picker"
            type="date"
            value={
              formData.startDate ? format(formData.startDate, "yyyy-MM-dd") : ""
            }
            onChange={(e) =>
              handleDateChange("startDate")(
                e.target.value ? new Date(e.target.value) : null
              )
            }
            InputLabelProps={{
              shrink: true,
            }}
            placeholder="Select date"
            onFocus={(e) => {
              if (!formData.startDate) {
                e.target.value = getTodayDateString();
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
        </LabelInputContainer>

        <LabelInputContainer className="mb-4">
          <div className="flex justify-between  w-full items-center gap-3">
            <div className={`w-full`}>
              <label
                className="text-sm font-medium text-white  leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor="repeat"
              >
                Repeat
              </label>
              <Select
                value={formData.repeat}
                onChange={handleSelectChange}
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
                  paddingRight: "30px", // Adjust padding for dropdown arrow
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
                  Weekly on{" "}
                  {getWeekdayFromDate(new Date(formData.startDate || today))}
                </MenuItem>
                <MenuItem value="monthly">
                  Monthly on the third{" "}
                  {getWeekdayFromDate(new Date(formData.startDate || today))}
                </MenuItem>
                <MenuItem value="annually">
                  Annually on{" "}
                  {new Intl.DateTimeFormat("en-US", {
                    month: "long",
                    day: "numeric",
                  }).format(new Date(formData.startDate || today))}
                </MenuItem>
                <MenuItem value="every-weekday">Weekly on Weekdays</MenuItem>
              </Select>
            </div>

            {formData.repeat !== "no-repeat" && (
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
                  value={
                    formData.endDate
                      ? format(formData.endDate, "yyyy-MM-dd")
                      : ""
                  }
                  onChange={(e) =>
                    handleDateChange("endDate")(
                      e.target.value ? new Date(e.target.value) : null
                    )
                  }
                  InputLabelProps={{
                    shrink: true,
                  }}
                  placeholder="Select date"
                  onFocus={(e) => {
                    if (!formData.endDate) {
                      e.target.value = getTodayDateString();
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
        </LabelInputContainer>

        {!formData.allDay && (
          <div className="flex justify-between gap-4">
            {/* Start Time */}
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
                value={formData.startTime || ""}
                onChange={(e) => handleTimeChange("startTime")(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            {/* End Time */}
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
                value={formData.endTime ?? ""}
                onChange={(e) => handleTimeChange("endTime")(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        )}

        <Tooltip title={"Generate Google Calendar link"} arrow>
          <button
            className="cool-button bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 mt-3 relative block w-full text-white rounded-md h-12 font-semibold shadow-lg transition duration-300 ease-in-out hover:bg-gradient-to-r hover:from-blue-700 hover:via-blue-600 hover:to-blue-800"
            type="submit"
          >
            Generate Link &rarr;
          </button>
        </Tooltip>
        <div className="bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent h-[1px] w-full" />
      </form>
    </div>
  );
};
export default GoogleCalendaCard;
