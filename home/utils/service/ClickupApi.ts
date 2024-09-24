const CLICKUP_API_URL = process.env.NEXT_PUBLIC_CLICKUP_API_URL;
const CLICKUP_API_TOKEN = process.env.NEXT_PUBLIC_CLICKUP_API_TOKEN;
const LEAD_TRACKER_LIST_ID = "901601327235";

const headers: {
  "Content-Type": string;
  Authorization?: string;
} = {
  "Content-Type": "application/json",
  Authorization: CLICKUP_API_TOKEN,
};

interface ClickUpTask {
  id: string;
  name: string;
  status: { status: string };
  date_updated: string;
  text_content: string;
  teamSize?: string;
  industry?: string;
  requirementType?: string;
  custom_fields: { name: string; value: string }[];
}

const parseTextContent = (
  textContent: string
): { teamSize?: string; industry?: string; requirementType?: string } => {
  const teamSizeMatch = textContent.match(/teamSize: ([^\n]+)/);
  const industryMatch = textContent.match(/industry: ([^\n]+)/);
  const requirementTypeMatch = textContent.match(/requirementType: ([^\n]+)/);

  return {
    teamSize: teamSizeMatch ? teamSizeMatch[1].trim() : undefined,
    industry: industryMatch ? industryMatch[1].trim() : undefined,
    requirementType: requirementTypeMatch
      ? requirementTypeMatch[1].trim()
      : undefined,
  };
};
const ClickupApi = {
  createTask: (data: any, listId: string) => {
    return new Promise((resolve, reject) => {
      fetch(`${CLICKUP_API_URL}/list/${listId}/task`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      })
        .then((res) => {
          if (!res.ok) {
            reject(new Error(`Request failed with status ${res.status}`));
          }
          resolve(res);
        })
        .catch((err) => reject(err));
    });
  },

  fetchLeadsFromClickUp: async (): Promise<ClickUpTask[]> => {
    try {
      const res = await fetch(
        `${CLICKUP_API_URL}/list/${LEAD_TRACKER_LIST_ID}/task`,
        {
          method: "GET",
          headers,
        }
      );
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const data = await res.json();
      return data.tasks.map((task: any): ClickUpTask => {
        const { teamSize, industry, requirementType } = parseTextContent(
          task.text_content
        );
        return {
          ...task,
          teamSize,
          industry,
          requirementType,
        };
      });
    } catch (err) {
      throw err;
    }
  },

  formatLeadsByStatus: async (): Promise<string> => {
    const leads: ClickUpTask[] = await ClickupApi.fetchLeadsFromClickUp();
    const leadsByStatus: { [key: string]: ClickUpTask[] } = leads.reduce(
      (acc: { [key: string]: ClickUpTask[] }, lead) => {
        const status = lead.status.status.toUpperCase();
        if (!acc[status]) {
          acc[status] = [];
        }
        acc[status].push(lead);
        return acc;
      },
      {}
    );

    let formattedLeads = "";

    for (const [status, leads] of Object.entries(leadsByStatus)) {
      formattedLeads += `*${leads.length} lead${leads.length > 1 ? "s" : ""} in ${status.toUpperCase()}*\n`;

      leads.forEach((lead) => {
        const dateUpdated =
          typeof lead.date_updated === "string"
            ? parseInt(lead.date_updated, 10)
            : lead.date_updated;
        const unixEpoch = new Date(0);
        const formattedDate = new Date(
          dateUpdated < unixEpoch.getTime() ? dateUpdated * 1000 : dateUpdated
        ).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        formattedLeads += `• ${lead.name} - *${lead.industry?.toUpperCase() || "N/A"}* - updated on ${formattedDate}\n`;
      });
      formattedLeads += "\n";
    }
    return formattedLeads.trim();
  },
};

export default ClickupApi;
