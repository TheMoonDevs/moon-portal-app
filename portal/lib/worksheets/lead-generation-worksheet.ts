import { z } from "zod";
import { WorksheetConfig } from "./types";
import { TMD_PORTAL_API_KEY } from "@/utils/constants/appInfo";

async function fetchCompanyOptionsFromApi(query: string) {
  const r = await fetch(
    `/api/worksheets/options?type=company&query=${encodeURIComponent(query)}`,
    { headers: { tmd_portal_api_key: TMD_PORTAL_API_KEY } }
  );
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error || "Failed to fetch options");
  return (d?.options ?? []) as { label: string; value: string | number }[];
}

async function runSendEmailAction(row: Record<string, unknown>) {
  const r = await fetch("/api/worksheets/actions/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      tmd_portal_api_key: TMD_PORTAL_API_KEY,
    },
    body: JSON.stringify({ row }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error || "Action failed");
}

export const leadGenerationWorksheet: WorksheetConfig = {
  id: "lead_generation_v1",
  name: "Lead Generation",
  slug: "lead-gen",
  indexKey: "email",
  serialColumn: {
    label: "Sr. No",
    width: 70,
  },
  columns: [
    {
      field: "name",
      label: "Full Name",
      type: "text",
      required: true,
      zodSchema: z.string().min(2),
      validationHint: 'Required, min 2 characters.',
    },
    {
      field: "email",
      label: "Email Address",
      type: "email",
      required: true,
      zodSchema: z.string().email(),
      validationHint: 'Required, valid email address.',
    },
    {
      field: "score",
      label: "Lead Score",
      type: "number",
      width: 100,
    },
    {
      field: "company",
      label: "Company",
      type: "asyncSelect",
      getOptions: fetchCompanyOptionsFromApi,
    },
    {
      field: "computed_priority",
      label: "Priority (Auto)",
      type: "computed",
      valueGetter: (row) => {
        if (!row.score) return "Low";
        if (row.score > 80) return "High";
        if (row.score > 50) return "Medium";
        return "Low";
      },
      width: 130,
    },
    {
      field: "_actions",
      label: "Actions",
      type: "actions",
      pinned: "right",
      width: 150,
      actions: [
        {
          id: "send_email",
          label: "Send Email",
          action: runSendEmailAction,
        },
      ],
    },
  ],
};
