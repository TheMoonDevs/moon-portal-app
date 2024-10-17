// app/api/leads/route.ts
import ClickupApi from "@/utils/service/ClickupApi";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log("Fetching leads from ClickUp...");
    const leads = await ClickupApi.fetchLeadsFromClickUp();
    console.log("Leads fetched successfully:", leads);

    const formattedLeads = await ClickupApi.formatLeadsByStatus();
    console.log("Leads formatted successfully:", formattedLeads);

    return NextResponse.json({ text: formattedLeads }, { status: 200 });
  } catch (error) {
    console.error("Error fetching leads from ClickUp:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads from ClickUp" },
      { status: 500 }
    );
  }
}
