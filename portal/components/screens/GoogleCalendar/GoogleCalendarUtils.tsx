import { Dispatch, SetStateAction } from "react";
export type FormDataType = {
  title: string;
  details: string;
  location: string | null;
  startDate: Date | null;
  repeat: string;
  startTime: any;
  endTime: any;
  allDay: boolean;
  endRepeat: Date | null;
  endDate: Date | null;
};

export type FormValidationsType = {
  title: boolean;
  startDate: boolean;
};

export const validateForm = (formData: FormDataType): FormValidationsType => {
  const isTitleEmpty = !formData.title;
  const isStartDateEmpty = !formData.startDate;

  return {
    title: isTitleEmpty,
    startDate: isStartDateEmpty,
  };
};

export const formatDate = (
  date: Date,
  time: string | Date | null,
  setAlertMessage: Dispatch<SetStateAction<string | null>>
): string | null => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    setAlertMessage("Invalid Date Format");
    return null;
  }
  const formattedDate = new Date(date);

  if (time) {
    if (typeof time === "string") {
      const [hours, minutes] = time.split(":").map(Number);
      formattedDate.setHours(hours, minutes);
    } else if (time instanceof Date) {
      formattedDate.setHours(time.getHours(), time.getMinutes());
    }
  }

  return formattedDate.toISOString().replace(/[-:.]/g, "").split(".")[0] + "Z";
};

export const formatAllDayDate = (
  date: Date,
  setAlertMessage: Dispatch<SetStateAction<string | null>>
): string | null => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    setAlertMessage("Invalid Date Format");
    return null;
  }

  const formattedDate = new Date(date);
  formattedDate.setDate(formattedDate.getDate() + 1); // Adjust for all-day event
  return formattedDate.toISOString().split("T")[0].replace(/-/g, "");
};

export const formatDates = (
  formData: FormDataType,
  setAlertMessage: Dispatch<SetStateAction<string | null>>
): { startDate: string; endDate: string } | null => {
  if (
    !formData.startDate ||
    !(formData.startDate instanceof Date) ||
    isNaN(formData.startDate.getTime())
  ) {
    setAlertMessage("Invalid Date Format");
    return null;
  }

  let formattedStartDate: string | null;
  let formattedEndDate: string | null;

  if (formData.allDay) {
    formattedStartDate = formatAllDayDate(formData.startDate, setAlertMessage);
    formattedEndDate = formattedStartDate; // All-day events have same start and end date
  } else {
    formattedStartDate = formatDate(
      formData.startDate,
      formData.startTime,
      setAlertMessage
    );
    const endDate =
      formData.endDate &&
      formData.endDate instanceof Date &&
      !isNaN(formData.endDate.getTime())
        ? new Date(formData.endDate)
        : new Date(formData.startDate.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours
    formattedEndDate = formatDate(endDate, formData.endTime, setAlertMessage);
  }

  if (!formattedStartDate || !formattedEndDate) return null;

  return { startDate: formattedStartDate, endDate: formattedEndDate };
};

export const generateRecurrenceRule = (formData: FormDataType): string => {
  if (formData.repeat === "no-repeat") return "";

  let freq = "";
  let until = "";

  if (formData.endRepeat) {
    const endRepeat = new Date(formData.endRepeat);
    endRepeat.setHours(23, 59, 59);
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
      return `RRULE:FREQ=${freq};BYDAY=MO${until}`;
    case "monthly":
      freq = "MONTHLY";
      return `RRULE:FREQ=${freq};BYDAY=+3MO${until}`;
    case "annually":
      freq = "YEARLY";
      const startDate = new Date(formData.startDate!);
      return `RRULE:FREQ=${freq};BYMONTH=${
        startDate.getMonth() + 1
      };BYMONTHDAY=${startDate.getDate()}${until}`;
    case "every-weekday":
      freq = "WEEKLY";
      return `RRULE:FREQ=${freq};BYDAY=MO,TU,WE,TH,FR${until}`;
    default:
      return `RRULE:FREQ=${formData.repeat.toUpperCase()}${until}`;
  }

  return `RRULE:FREQ=${freq}${until}`;
};

export const buildGoogleCalendarURL = (
  formData: FormDataType,
  startDate: string,
  endDate: string,
  recurrence: string
): string => {
  let url = `https://calendar.google.com/calendar/u/0/r/eventedit?text=${encodeURIComponent(
    formData.title
  )}&dates=${startDate}/${endDate}`;

  if (formData.details) {
    url += `&details=${encodeURIComponent(formData.details)}`;
  }
  if (formData.location) {
    url += `&location=${encodeURIComponent(formData.location)}`;
  }
  if (recurrence) {
    url += `&recur=${encodeURIComponent(recurrence)}`;
  }

  return url;
};
