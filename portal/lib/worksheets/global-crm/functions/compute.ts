export const globalCrmComputes = {
  "globalCrm.valueUsd": ({ row }: { row: Record<string, unknown> }) => {
    const price = Number(row.local_price);
    const code = (row.currency_code as string) || "USD";
    if (!price || Number.isNaN(price)) return "";
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
} as const;
