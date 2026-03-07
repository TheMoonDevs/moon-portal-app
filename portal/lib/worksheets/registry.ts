import { WorksheetConfig } from "./types";
import { leadGenerationWorksheet } from "./lead-generation-worksheet";
import { globalCrmWorksheet } from "./global-crm-worksheet";
import { contactFormWorksheet } from "./contact-form-worksheet";

export const worksheetRegistry: Record<string, WorksheetConfig> = {
  [contactFormWorksheet.id]: contactFormWorksheet,
  [leadGenerationWorksheet.id]: leadGenerationWorksheet,
  [globalCrmWorksheet.id]: globalCrmWorksheet,
};

export function getWorksheetConfig(idOrSlug: string): WorksheetConfig | undefined {
  const byId = worksheetRegistry[idOrSlug];
  if (byId) return byId;

  return Object.values(worksheetRegistry).find((f) => f.slug === idOrSlug);
}
