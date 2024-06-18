"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";

import {
  validateForm,
  buildGoogleCalendarURL,
  formatDates,
  generateRecurrenceRule,
  FormDataType,
} from "./GoogleCalendarUtils";

import {
  useHandleInputChange,
  useHandleDateChange,
  useHandleTimeChange,
  useHandleSelectChange,
  useToggleAllDay,
} from "./GoogleCalendarHandlers";
import {
  AllDayCheckbox,
  DateInput,
  DetailsInput,
  Header,
  LocationInput,
  RepeatOptions,
  SubmitButton,
  TimeInputs,
  TitleInput,
} from "./GoogleCalendarComponent";

const GoogleCalendarCard: React.FC = () => {
  const [formData, setFormData] = useState<FormDataType>({
    title: "",
    details: "",
    location: "",
    startDate: null,
    repeat: "no-repeat",
    startTime: "11:00",
    endTime: "12:00",
    allDay: false,
    endRepeat: null,
    endDate: null,
  });

  const [formValidations, setFormValidations] = useState({
    title: undefined as boolean | undefined,
    startDate: undefined as boolean | undefined,
  });

  const today = new Date();

  const handleInputChange = useHandleInputChange(setFormData);
  const handleDateChange = useHandleDateChange(setFormData, today);
  const handleTimeChange = useHandleTimeChange(setFormData);
  const handleSelectChange = useHandleSelectChange(setFormData);
  const toggleAllDay = useToggleAllDay(setFormData);

  useEffect(() => {
    setFormValidations({
      title: false,
      startDate: false,
    });
  }, [formData.title, formData.startDate]);

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
  return (
    <div className="max-w-md w-full mx-auto rounded-none md:rounded-2xl mb-5 p-4 md:p-8 shadow-input bg-black/90">
      <Header />
      <h2 className="font-bold mt-3 text-center text-xl text-white">
        Invite Link Generator
      </h2>
      <div className="bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent my-3 h-[1px] w-full" />
      <form className="my-3" onSubmit={handleSubmit}>
        <AllDayCheckbox checked={formData.allDay} onChange={toggleAllDay} />
        <TitleInput
          value={formData.title}
          onChange={handleInputChange}
          error={formValidations.title ?? false}
        />
        <DetailsInput value={formData.details} onChange={handleInputChange} />
        <LocationInput
          value={formData.location || ""}
          onChange={handleInputChange}
        />
        <DateInput
          label="Start Date"
          value={
            formData.startDate ? format(formData.startDate, "yyyy-MM-dd") : ""
          }
          onChange={(e) =>
            handleDateChange("startDate")(
              e.target.value ? new Date(e.target.value) : null
            )
          }
          error={formValidations.startDate}
        />
        <RepeatOptions
          repeatValue={formData.repeat}
          onRepeatChange={handleSelectChange}
          endDateValue={
            formData.endDate ? format(formData.endDate, "yyyy-MM-dd") : ""
          }
          onEndDateChange={(e) =>
            handleDateChange("endDate")(
              e.target.value ? new Date(e.target.value) : null
            )
          }
          startDate={
            formData.startDate ? format(formData.startDate, "yyyy-MM-dd") : null
          }
        />
        {!formData.allDay && (
          <TimeInputs
            startTime={formData.startTime}
            onStartTimeChange={handleTimeChange("startTime")}
            endTime={formData.endTime}
            onEndTimeChange={handleTimeChange("endTime")}
          />
        )}
        <SubmitButton />
        <div className="bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent h-[1px] w-full" />
      </form>
    </div>
  );
};
export default GoogleCalendarCard;
