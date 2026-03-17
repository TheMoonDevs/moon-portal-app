import { defineWorksheet, defineWorksheetBundle } from "@/lib/worksheets/core";
import {
  contactFormActions,
  contactFormComputes,
  contactFormOptions,
} from "./functions";

export default defineWorksheetBundle({
  schema: defineWorksheet({
    id: "contact_form_v1",
    name: "Contact Form",
    slug: "contact-form",
    googleFormSheet: true,
    fields: (f) => ({
      name: f
        .text()
        .required()
        .validationHint("Required.")
        .googleForm({ questionTitle: "Name", questionType: "shortText" }),
      email: f
        .email()
        .required()
        .validationHint("Required, valid email.")
        .indexed()
        .unique()
        .googleForm({ questionTitle: "Email", questionType: "shortText" }),
      date_of_birth: f
        .dateOrString()
        .optional()
        .validationHint("Optional date.")
        .googleForm({ questionTitle: "Date of Birth", questionType: "date" }),
      preferred_cities: f
        .asyncSelect()
        .optional()
        .optionsType("preferred_cities")
        .ui({ width: 220 })
        .googleForm({
          questionTitle: "Preferred Cities",
          questionType: "checkboxes",
        }),
      current_city: f
        .asyncSelect()
        .optional()
        .optionsType("country")
        .googleForm({ questionTitle: "Current City", questionType: "dropdown" }),
      comments: f
        .text()
        .optional()
        .googleForm({ questionTitle: "Comments", questionType: "paragraph" }),
    }),
    columns: (c) => [c.serial().label("Sr. No").width(70)],
  }).schema,
  actions: contactFormActions,
  computes: contactFormComputes,
  options: contactFormOptions,
});
