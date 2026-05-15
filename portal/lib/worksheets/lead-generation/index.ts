import { defineWorksheet, defineWorksheetBundle } from '@/lib/worksheets/core';

import {
  leadGenerationActions,
  leadGenerationComputes,
  leadGenerationOptions,
} from './functions';

export default defineWorksheetBundle({
  schema: defineWorksheet({
    id: 'lead_generation_v1',
    name: 'Lead Generation',
    slug: 'lead-gen',
    googleFormSheet: true,
    fields: (f) => ({
      name: f
        .text()
        .required()
        .minLength(2)
        .validationHint('Required, min 2 characters.')
        .googleForm({ questionTitle: 'Name', questionType: 'shortText' }),
      email: f
        .email()
        .required()
        .validationHint('Required, valid email address.')
        .indexed()
        .googleForm({ questionTitle: 'Email', questionType: 'shortText' }),
      score: f
        .number()
        .min(0)
        .max(100)
        .optional()
        .ui({ width: 100 })
        .googleForm({ questionTitle: 'Score', questionType: 'shortText' }),
      company: f
        .asyncSelect()
        .optional()
        .optionsFn('lead.options.companyInternalApi')
        .googleForm({ questionTitle: 'Company', questionType: 'dropdown' })
        .ui({ width: 200 }),
      country: f
        .asyncSelect()
        .optional()
        .optionsFn('lead.options.countryExternalApi')
        .googleForm({ questionTitle: 'Country', questionType: 'dropdown' })
        .ui({ width: 180 }),
      timezone: f
        .asyncSelect()
        .optional()
        .optionsType('timezone')
        .googleForm({ questionTitle: 'Timezone', questionType: 'dropdown' })
        .ui({ width: 250 }),
      currency_code: f
        .enum([
          { label: 'USD', value: 'USD' },
          { label: 'EUR', value: 'EUR' },
        ])
        .optional()
        .googleForm({
          questionTitle: 'Currency Code',
          questionType: 'dropdown',
        })
        .ui({ width: 140 }),
      preferred_cities: f
        .asyncSelect()
        .optional()
        .optionsType('preferred_cities')
        .googleForm({
          questionTitle: 'Preferred Cities',
          questionType: 'dropdown',
        })
        .ui({ width: 220 }),
      last_email_sent_at: f.text().optional().ui({ hidden: true }),
    }),
    columns: (c) => [
      c.serial().label('Sr. No').width(70),
      c
        .computed()
        .pipeline(
          'lead.score.toNumber',
          'lead.score.toBand',
          'lead.score.toLabel',
        )
        .label('Priority (Pipeline)')
        .ui({ width: 130 }),
      c.actions().pinRight().width(150).add('lead.sendEmail', {
        label: 'Actions',
      }),
    ],
  }).schema,
  actions: leadGenerationActions,
  computes: leadGenerationComputes,
  options: leadGenerationOptions,
});
