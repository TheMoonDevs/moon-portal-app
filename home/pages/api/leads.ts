// pages/api/leads.ts
import ClickupApi from "@/utils/service/ClickupApi";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // if (req.method !== "POST") {
  //   return res.status(405).json({ error: "Method not allowed" });
  // }

  try {
    console.log("Fetching leads from ClickUp...");
    const leads = await ClickupApi.fetchLeadsFromClickUp();
    console.log("Leads fetched successfully:", leads);
    const formattedLeads = await ClickupApi.formatLeadsByStatus();
    console.log("Leads formatted successfully:", formattedLeads);
    return res.status(200).json({ text: formattedLeads });
  } catch (error) {
    console.error("Error fetching leads from ClickUp:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch leads from ClickUp" });
  }
};

export default handler;
