import { TMD_PORTAL_API_KEY } from "@/utils/constants/appInfo";

export const leadGenerationActions = {
  "lead.sendEmail": async ({ row }: { row: Record<string, unknown> }) => {
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
    if (d?.patch && typeof d.patch === "object") {
      return {
        type: "patchRow",
        patch: d.patch as Record<string, unknown>,
      } as const;
    }
    return { type: "none" } as const;
  },
} as const;
