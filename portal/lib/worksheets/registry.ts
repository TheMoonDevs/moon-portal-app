import contactFormWorksheet from '@/lib/worksheets/contact-form';
import type {
  contactFormActions,
  contactFormComputes,
  contactFormOptions,
} from '@/lib/worksheets/contact-form/functions';
import type { globalActions } from '@/lib/worksheets/global/actions';
import type { globalComputes } from '@/lib/worksheets/global/compute';
import type { globalOptionsByType } from '@/lib/worksheets/global/options';
import globalCrmWorksheet from '@/lib/worksheets/global-crm';
import type {
  globalCrmActions,
  globalCrmComputes,
  globalCrmOptions,
} from '@/lib/worksheets/global-crm/functions';
import leadGenerationWorksheet from '@/lib/worksheets/lead-generation';
import type {
  leadGenerationActions,
  leadGenerationComputes,
  leadGenerationOptions,
} from '@/lib/worksheets/lead-generation/functions';

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
