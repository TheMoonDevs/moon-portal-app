import contactFormWorksheet from "@/lib/worksheets/contact-form";
import globalCrmWorksheet from "@/lib/worksheets/global-crm";
import leadGenerationWorksheet from "@/lib/worksheets/lead-generation";
import { globalActions } from "@/lib/worksheets/global/actions";
import { globalComputes } from "@/lib/worksheets/global/compute";
import { globalOptionsByType } from "@/lib/worksheets/global/options";
import {
  contactFormActions,
  contactFormComputes,
  contactFormOptions,
} from "@/lib/worksheets/contact-form/functions";
import {
  globalCrmActions,
  globalCrmComputes,
  globalCrmOptions,
} from "@/lib/worksheets/global-crm/functions";
import {
  leadGenerationActions,
  leadGenerationComputes,
  leadGenerationOptions,
} from "@/lib/worksheets/lead-generation/functions";

export const worksheets = {
  contactForm: contactFormWorksheet,
  leadGeneration: leadGenerationWorksheet,
  globalCrm: globalCrmWorksheet,
} as const;

export type ActionKey =
  | keyof typeof globalActions
  | keyof typeof contactFormActions
  | keyof typeof globalCrmActions
  | keyof typeof leadGenerationActions;

export type ComputeKey =
  | keyof typeof globalComputes
  | keyof typeof contactFormComputes
  | keyof typeof globalCrmComputes
  | keyof typeof leadGenerationComputes;

export type OptionsFnKey =
  | keyof typeof contactFormOptions
  | keyof typeof globalCrmOptions
  | keyof typeof leadGenerationOptions;

export type OptionsTypeKey = keyof typeof globalOptionsByType;
