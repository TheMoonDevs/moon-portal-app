import type { OptionsContext } from "@/lib/worksheets/functions";

type OptionItem = { label: string; value: string | number };

function dedupeAndLimit(options: OptionItem[], limit = 25): OptionItem[] {
  const seen = new Set<string>();
  const deduped: OptionItem[] = [];
  for (const opt of options) {
    const key = `${opt.value}::${opt.label}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(opt);
    if (deduped.length >= limit) break;
  }
  return deduped;
}

export const leadGenerationOptions = {
  // Internal API example: uses /api/worksheets response and maps mixed structure to select options.
  "lead.options.companyInternalApi": async (
    query: string,
    _ctx: OptionsContext,
  ): Promise<OptionItem[]> => {
    const res = await fetch("http://localhost:3000/api/worksheets", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];

    const data = (await res.json()) as unknown;
    const items = Array.isArray(data) ? data : [];
    const q = query.trim().toLowerCase();

    const mapped = items
      .map((it) => {
        const row = it as Record<string, unknown>;
        const label = String(
          row.name ?? row.slug ?? row.id ?? row.worksheetId ?? "Unknown Worksheet",
        );
        const value = String(row.id ?? row.slug ?? label);
        return { label, value };
      })
      .filter((o) => (q ? o.label.toLowerCase().includes(q) : true));

    return dedupeAndLimit(mapped);
  },

  // External API example: uses REST Countries and maps arbitrary API shape to label/value options.
  "lead.options.countryExternalApi": async (
    query: string,
    _ctx: OptionsContext,
  ): Promise<OptionItem[]> => {
    const term = query.trim();
    if (!term) return [];

    const url = `https://restcountries.com/v3.1/name/${encodeURIComponent(term)}?fields=name,cca2`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];

    const data = (await res.json()) as unknown;
    const items = Array.isArray(data) ? data : [];

    const mapped = items.map((it) => {
      const row = it as { name?: { common?: string }; cca2?: string };
      const label = row.name?.common ?? row.cca2 ?? "Unknown";
      const value = row.cca2 ?? label;
      return { label, value };
    });

    return dedupeAndLimit(mapped);
  },
} as const;
