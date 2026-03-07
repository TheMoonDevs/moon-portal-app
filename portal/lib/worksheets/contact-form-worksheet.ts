import { z } from "zod";
import { WorksheetConfig } from "./types";

/**
 * Worksheet for "Form for Testing Portal Worksheet" – Google Form submissions
 * via webhook. Use worksheetId: contact_form_v1 or slug: contact-form.
 */
export const contactFormWorksheet: WorksheetConfig = {
  id: "contact_form_v1",
  name: "Contact Form",
  slug: "contact-form",
  indexKey: "email",
  serialColumn: { label: "Sr. No", width: 70 },
  columns: [
    {
      field: "name",
      label: "Name",
      type: "text",
      required: true,
      zodSchema: z.string().min(1),
      validationHint: "Required.",
    },
    {
      field: "email",
      label: "Email",
      type: "email",
      required: true,
      zodSchema: z.string().email(),
      validationHint: "Required, valid email.",
    },
    {
      field: "date_of_birth",
      label: "Date of Birth",
      type: "date",
      required: false,
      zodSchema: z.union([z.string(), z.date()]).optional(),
    },
    {
      field: "preferred_cities",
      label: "Preferred Cities",
      type: "text",
      required: true,
      zodSchema: z.union([
        z.string().min(1),
        z.array(z.string()).min(1),
      ]),
      validationHint: "At least one city required.",
      valueFormatter: (v) =>
        v == null ? "" : Array.isArray(v) ? v.join(", ") : String(v),
    },
    {
      field: "other",
      label: "Other",
      type: "text",
      required: false,
    },
    {
      field: "current_city",
      label: "Current City",
      type: "text",
      required: false,
    },
    {
      field: "comments",
      label: "Comments",
      type: "text",
      required: false,
    },
  ],
};
