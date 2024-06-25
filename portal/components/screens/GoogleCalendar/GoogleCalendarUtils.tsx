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

// 📝 Validates the form data, ensuring title and startDate are provided.
export const validateForm = (
  formData: FormDataType
): { title: boolean; startDate: boolean } => {
  // Check if either title or startDate is empty
  const isTitleEmpty = !formData.title;
  const isStartDateEmpty = !formData.startDate;

  return {
    title: isTitleEmpty,
    startDate: isStartDateEmpty,
  };
};

// 📅 Formats the given date and time into a Google Calendar compatible string.
export const formatDate = (date: Date, time?: string | Date): string => {
  if (!(date instanceof Date) || isNaN(date.getTime()))
    throw new Error("Invalid date provided");

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

// 📅 Formats an all-day date into a Google Calendar compatible string.
export const formatAllDayDate = (date: Date): string => {
  if (!(date instanceof Date) || isNaN(date.getTime()))
    throw new Error("Invalid date provided");

  const formattedDate = new Date(date);
  formattedDate.setDate(formattedDate.getDate() + 1); // Adjust for all-day event
  return formattedDate.toISOString().split("T")[0].replace(/-/g, "");
};

// 📅 Formats the start and end dates based on whether it's an all-day event or not.
export const formatDates = (
  formData: FormDataType
): { startDate: string; endDate: string } => {
  if (
    !formData.startDate ||
    !(formData.startDate instanceof Date) ||
    isNaN(formData.startDate.getTime())
  ) {
    throw new Error("Invalid start date provided");
  }

  let formattedStartDate: string;
  let formattedEndDate: string;

  if (formData.allDay) {
    formattedStartDate = formatAllDayDate(formData.startDate);
    formattedEndDate = formattedStartDate; // All-day events have same start and end date
  } else {
    formattedStartDate = formatDate(formData.startDate, formData.startTime);
    const endDate =
      formData.endDate &&
      formData.endDate instanceof Date &&
      !isNaN(formData.endDate.getTime())
        ? new Date(formData.endDate)
        : new Date(formData.startDate.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours
    formattedEndDate = formatDate(endDate, formData.endTime);
  }

  return { startDate: formattedStartDate, endDate: formattedEndDate };
};

// 🔄 Generates the recurrence rule for the event based on formData.
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

// 🔗 Constructs the Google Calendar URL with the formatted dates and recurrence rule.
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
