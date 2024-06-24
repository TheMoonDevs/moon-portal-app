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
  useHandleTimeChange,
  useHandleSelectChange,
  useToggleAllDay,
} from "./GoogleCalendarHandlers";
import {
  AllDayCheckbox,
  DetailsInput,
  Header,
  LocationInput,
  RepeatOptions,
  SubmitButton,
  TimeInputs,
  TitleInput,
} from "./GoogleCalendarComponent";
import DatePicker from "../Members/DatePicker";

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

  const handleInputChange = useHandleInputChange(setFormData);
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

  const handleDateChange = (selectedDate: string) => {
    setFormData({
      ...formData,
      startDate: selectedDate ? new Date(selectedDate) : null,
    });
  };

  return (
    <div className="max-w-[90vw] md:max-w-[60vw] md:w-full mx-auto rounded-lg mb-5 p-4 md:p-8 shadow-input border border-gray-400">
      <Header />
      <h2 className="font-normal mt-3 text-center text-3xl md:text-4xl text-gray-900">
        Invite Link Generator
      </h2>
      <div className="bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent my-3 h-[1px] w-full"></div>
      <form className="my-3 " onSubmit={handleSubmit}>
        <div className="flex justify-end items-center mt-4">
          <AllDayCheckbox checked={formData.allDay} onChange={toggleAllDay} />
        </div>
        <div className="flex flex-col md:flex-row md:justify-between md:space-x-4">
          <div className="flex-1 space-y-4">
            <TitleInput
              value={formData.title}
              onChange={handleInputChange}
              error={formValidations.title ?? false}
            />
            <LocationInput
              value={formData.location || ""}
              onChange={handleInputChange}
            />
            <DetailsInput
              value={formData.details}
              onChange={handleInputChange}
            />
          </div>
          <div className="flex-1 ">
            <div className="mb-1 ">
              <span
                className={`text-sm font-medium leading-none mt-2 ${
                  formValidations.startDate ? "text-red-500" : "text-black"
                }`}
                style={{ padding: "0" }}
              >
                {formValidations.startDate
                  ? "*Start Date is Required"
                  : "Start Date"}
              </span>
              <DatePicker
                placeholder="Select start date"
                onDateChange={handleDateChange}
              />
            </div>

            <div className="md:mt-4">
              <RepeatOptions
                repeatValue={formData.repeat}
                onRepeatChange={handleSelectChange}
                endDateValue={
                  formData.endDate
                    ? format(new Date(formData.endDate), "yyyy-MM-dd")
                    : ""
                }
                onEndDateChange={(selectedDate) => {
                  setFormData({
                    ...formData,
                    endDate: selectedDate ? new Date(selectedDate) : null,
                  });
                }}
                startDate={
                  formData.startDate
                    ? format(new Date(formData.startDate), "yyyy-MM-dd")
                    : null
                }
              />
              {!formData.allDay && (
                <div className="flex space-x-4">
                  <TimeInputs
                    startTime={formData.startTime}
                    onStartTimeChange={handleTimeChange("startTime")}
                    endTime={formData.endTime}
                    onEndTimeChange={handleTimeChange("endTime")}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
};

export default GoogleCalendarCard;
