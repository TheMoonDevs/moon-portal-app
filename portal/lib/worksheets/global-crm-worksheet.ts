import { z } from "zod";
import { WorksheetConfig } from "./types";
import { TMD_PORTAL_API_KEY } from "@/utils/constants/appInfo";

async function fetchOptionsFromApi(
  type: "country" | "timezone",
  query: string
): Promise<{ label: string; value: string | number }[]> {
  const r = await fetch(
    `/api/worksheets/options?type=${type}&query=${encodeURIComponent(query)}`,
    { headers: { tmd_portal_api_key: TMD_PORTAL_API_KEY } }
  );
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error || "Failed to fetch options");
  return (d?.options ?? []) as { label: string; value: string | number }[];
}

export const globalCrmWorksheet: WorksheetConfig = {
  id: "global_crm_v1",
  name: "Global CRM",
  slug: "global-crm",
  indexKey: "email",
  serialColumn: {
    label: "Sr. No",
    width: 70,
  },
  idColumn: false,
  createdAtColumn: false,
  updatedAtColumn: false,
  columns: [
    {
      field: "name",
      label: "Full Name",
      type: "text",
      required: true,
      zodSchema: z.string().min(2),
      validationHint: "Required, min 2 characters.",
      width: 200,
      pinned: "left"
    },
    {
      field: "email",
      label: "Email Address",
      type: "email",
      required: true,
      zodSchema: z.string().email(),
      validationHint: "Required, valid email address.",
      width: 250,
    },
    {
      field: "country",
      label: "Country",
      type: "asyncSelect",
      getOptions: (q) => fetchOptionsFromApi("country", q),
      width: 180,
    },
    {
      field: "timezone",
      label: "Timezone",
      type: "asyncSelect",
      getOptions: (q) => fetchOptionsFromApi("timezone", q),
      width: 250,
    },
    {
      field: "phone",
      label: "Phone Number",
      type: "text",
      width: 180,
    },
    {
      field: "local_price",
      label: "Deal Value (Local)",
      type: "number",
      width: 150,
      align: "right",
      numberFormat: "currency",
      decimalPlaces: 2,
      currencyField: "currency_code",
    },
    {
      field: "currency_code",
      label: "Currency",
      type: "enum",
      options: ["USD", "EUR", "GBP", "INR", "JPY", "AUD", "CAD"],
      width: 120,
      align: "center",
    },
    {
      field: "deal_date",
      label: "Deal Date",
      type: "date",
      width: 150,
      align: "center",
      dateFormat: "medium",
    },
    {
      field: "value_usd",
      label: "Value (USD)",
      type: "computed",
      width: 150,
      align: "right",
      valueGetter: (row) => {
        const price = Number(row.local_price);
        const code = row.currency_code || "USD";
        if (!price || isNaN(price)) return "";
        const rates: Record<string, number> = {
          USD: 1,
          EUR: 1.08,
          GBP: 1.27,
          INR: 0.012,
          JPY: 0.0067,
          AUD: 0.65,
          CAD: 0.74,
        };
        const rate = rates[code] ?? 1;
        const usd = price * rate;
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 2,
        }).format(usd);
      },
    },
  ],
};