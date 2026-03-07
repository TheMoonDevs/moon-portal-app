"use server";

import { countries } from "countries-list";

export async function fetchCountryOptions(query: string) {
  const options = Object.entries(countries).map(([code, data]) => ({
    label: `${data.name} (${code})`,
    value: code,
  }));
  
  if (!query) return options;
  
  return options.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));
}

export async function fetchTimezoneOptions(query: string) {
  try {
    // Requires Node.js 18+ which has Intl.supportedValuesOf
    const timezones = Intl.supportedValuesOf('timeZone');
    const options = timezones.map(tz => ({ label: tz, value: tz }));
    if (!query) return options;
    return options.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));
  } catch (e) {
    // Fallback if Intl.supportedValuesOf is not supported
    return [{ label: "UTC", value: "UTC" }];
  }
}
