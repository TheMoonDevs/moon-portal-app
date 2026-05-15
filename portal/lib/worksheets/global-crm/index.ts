import { defineWorksheet, defineWorksheetBundle } from '@/lib/worksheets/core';

import {
  globalCrmActions,
  globalCrmComputes,
  globalCrmOptions,
} from './functions';

export default defineWorksheetBundle({
  schema: defineWorksheet({
    id: 'global_crm_v1',
    name: 'Global CRM',
    slug: 'global-crm',
    googleFormSheet: true,
    idColumn: false,
    createdAtColumn: false,
    updatedAtColumn: false,
    fields: (f) => ({
      name: f
        .text()
        .required()
        .minLength(2)
        .validationHint('Required, min 2 characters.')
        .googleForm({ questionTitle: 'Name', questionType: 'shortText' })
        .ui({ width: 200, pinned: 'left' }),
      email: f
        .email()
        .required()
        .validationHint('Required, valid email address.')
        .indexed()
        .unique()
        .googleForm({ questionTitle: 'Email', questionType: 'shortText' })
        .ui({ width: 250 }),
      country: f
        .asyncSelect()
        .optional()
        .optionsType('country')
        .googleForm({ questionTitle: 'Country', questionType: 'shortText' })
        .ui({ width: 180 }),
      timezone: f
        .asyncSelect()
        .optional()
        .optionsType('timezone')
        .googleForm({ questionTitle: 'Timezone', questionType: 'shortText' })
        .ui({ width: 250 }),
      phone: f
        .text()
        .optional()
        .googleForm({ questionTitle: 'Phone', questionType: 'shortText' })
        .ui({ width: 180 }),
      local_price: f
        .number()
        .optional()
        .googleForm({ questionTitle: 'Local Price', questionType: 'shortText' })
        .ui({ width: 150, align: 'right' }),
      currency_code: f
        .asyncSelect()
        .optional()
        .optionsType('currency_code')
        .googleForm({
          questionTitle: 'Currency Code',
          questionType: 'shortText',
        })
        .ui({ width: 120, align: 'center' }),
      deal_date: f
        .dateOrString()
        .optional()
        .googleForm({ questionTitle: 'Deal Date', questionType: 'date' })
        .ui({ width: 150, align: 'center' }),
    }),
    columns: (c) => [
      c.serial().label('Sr. No').width(70),
      c
        .computed()
        .compute('globalCrm.valueUsd')
        .label('Value (USD)')
        .ui({ width: 150, align: 'right' }),
    ],
  }).schema,
  actions: globalCrmActions,
  computes: globalCrmComputes,
  options: globalCrmOptions,
});
