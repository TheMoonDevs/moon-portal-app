import { countries } from "countries-list";

export async function fetchCountryOptions(query: string) {
  const options = Object.entries(countries).map(([code, data]) => ({
    label: `${data.name} (${code})`,
    value: code,
  }));

  if (!query) return options;
  return options.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));
}

export async function fetchTimezoneOptions(query: string) {
  try {
    const timezones = Intl.supportedValuesOf("timeZone");
    const options = timezones.map((tz) => ({ label: tz, value: tz }));
    if (!query) return options;
    return options.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));
  } catch {
    return [{ label: "UTC", value: "UTC" }];
  }
}

type OptionItem = { label: string; value: string | number };

async function fetchCompanyOptions(query: string): Promise<OptionItem[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const companies = [
    "Apple",
    "Google",
    "Microsoft",
    "Amazon",
    "Facebook",
    "Tesla",
    "Netflix",
  ];
  return companies
    .filter((c) => c.toLowerCase().includes(query.toLowerCase()))
    .map((c) => ({ label: c, value: c }));
}

async function fetchCurrencyCodeOptions(query: string): Promise<OptionItem[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const codes = ["USD", "EUR", "GBP", "INR", "AED", "JPY", "AUD", "CAD"];
  return codes
    .filter((c) => c.toLowerCase().includes(query.toLowerCase()))
    .map((c) => ({ label: c, value: c }));
}

export const globalOptionsByType = {
  company: fetchCompanyOptions,
  country: fetchCountryOptions,
  timezone: fetchTimezoneOptions,
  currency_code: fetchCurrencyCodeOptions,
  preferred_cities: fetchCountryOptions,
} as const;
