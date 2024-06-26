import { SelectChangeEvent } from "@mui/material";
import { FormDataType } from "./GoogleCalendarUtils"; // adjust the path as needed
import { format } from "date-fns";

// 📝 Handles changes to text inputs and textareas.
export const useHandleInputChange =
  (setFormData: React.Dispatch<React.SetStateAction<FormDataType>>) =>
  (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

// 📅 Handles changes to date inputs.
export const useHandleDateChange =
  (
    setFormData: React.Dispatch<React.SetStateAction<FormDataType>>,
    today: Date
  ) =>
  (name: keyof FormDataType) =>
  (date: Date | null) => {
    if (date) {
      date.setHours(0, 0, 0, 0); // Ensure the date is set to the start of the day
    }
    setFormData((prevData) => ({
      ...prevData,
      [name]: date || today,
    }));
  };

// 🕒 Handles changes to time inputs.
export const useHandleTimeChange =
  (setFormData: React.Dispatch<React.SetStateAction<FormDataType>>) =>
  (name: keyof FormDataType) =>
  (time: Date | string | null) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: time,
    }));
  };

// 🔄 Handles changes to select inputs.
export const useHandleSelectChange =
  (setFormData: React.Dispatch<React.SetStateAction<FormDataType>>) =>
  (event: SelectChangeEvent<string>) => {
    setFormData((prevData) => ({
      ...prevData,
      repeat: event.target.value,
    }));
  };

// ✅ Toggles the allDay field.
export const useToggleAllDay =
  (setFormData: React.Dispatch<React.SetStateAction<FormDataType>>) => () => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      allDay: !prevFormData.allDay,
    }));
  };

// 📅 Gets today's date as a formatted string.
export const getTodayDateString = () => {
  const today = new Date();
  return format(today, "yyyy-MM-dd");
};
