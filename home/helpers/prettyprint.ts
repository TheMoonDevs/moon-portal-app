export const numberWithCommas = (x: number | string) => {
  if (!x) return "0";
  var parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};

export function replaceLast(x: string, y: string, z: string) {
  var pos = x.lastIndexOf(y);
  x = x.substring(0, pos) + z + x.substring(pos + y.length);
  return x;
}

// Captures 0x + 4 characters, then the last 4 characters.
const truncateRegex = /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/;

export const prettyEthAddress = (address: string) => {
  if (!address) return "";
  const match = address.match(truncateRegex);
  if (!match) return address;
  return `${match[1]}…${match[2]}`;
};

export const prettyPrintDateAndTime = (date_timestamp: string) => {
  if (!date_timestamp) return "";
  let dt = new Date();
  dt.setTime(parseInt(date_timestamp) * 1000);
  return `${dt.toLocaleDateString()} | ${dt.toLocaleTimeString()}`;
};

export const formatDate = (timestamp: string): string => {
  const months: string[] = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dateObj = new Date(timestamp);
  const hours = dateObj.getUTCHours().toString().padStart(2, "0");
  const minutes = dateObj.getUTCMinutes().toString().padStart(2, "0");
  const day = dateObj.getUTCDate();
  const month = dateObj.getUTCMonth();
  const year = dateObj.getUTCFullYear();

  const monthName = months[month];
  const formattedDate = `${hours}:${minutes} ${day} ${monthName} ${year}`;

  return formattedDate;
};

export const prettySinceTime = (date_string: string) => {
  if (!date_string) return "";
  let dt = new Date(date_string);
  const seconds = Math.floor(((new Date() as any) - (dt as any)) / 1000);
  let interval = seconds / 86400;
  if (interval > 1) {
    const days = Math.floor(interval);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }
  interval = seconds / 3600;
  if (interval > 1) {
    const hourse = Math.floor(interval);
    return `${hourse} hour${hourse > 1 ? "s" : ""} ago`;
  }
  interval = seconds / 60;
  if (interval > 1) {
    return `${Math.floor(interval)} minutes ago`;
  }
  return `${Math.floor(seconds)} seconds ago`;
};

export const prettySinceTimeFromMillis = (dt: number) => {
  const seconds = Math.floor(((new Date() as any) - (dt as any)) / 1000);
  let interval = seconds / 86400;
  if (interval > 1) {
    const days = Math.floor(interval);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }
  interval = seconds / 3600;
  if (interval > 1) {
    const hourse = Math.floor(interval);
    return `${hourse} hour${hourse > 1 ? "s" : ""} ago`;
  }
  interval = seconds / 60;
  if (interval > 1) {
    return `${Math.floor(interval)} minutes ago`;
  }
  return `${Math.floor(seconds)} seconds ago`;
};

export const formatNumberToText = (
  amount: string | number,
  nodecimals = false,
  decimals = 3
) => {
  let out_amount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (nodecimals || decimals === 0)
    return numberWithCommas(out_amount?.toFixed(0));
  return numberWithCommas(parseFloat(out_amount?.toFixed(decimals)));
};

export const formatTextToNumber = (amount: string | number) => {
  if (amount == null) return 0;
  let out_amount = typeof amount === "number" ? amount.toString() : amount;
  return parseFloat(out_amount?.replace(/[^\d.]/g, ""));
};

export const generateUUID = () => {
  var d = new Date().getTime(); //Timestamp
  var d2 =
    (typeof performance !== "undefined" &&
      performance.now &&
      performance.now() * 1000) ||
    0; //Time in microseconds since page-load or 0 if unsupported
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = Math.random() * 16; //random number between 0 and 16
    if (d > 0) {
      //Use timestamp until depleted
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      //Use microseconds since page-load if supported
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
};

// a function to print date in Nov 03 format
export const prettyPrintDateInMMMDD = (date: Date) => {
  const month = date.toLocaleString("default", { month: "short" });
  const day = date.getDate();
  return `${month} ${day}`;
};
