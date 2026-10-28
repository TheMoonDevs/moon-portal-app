/**
 * Application forms: the shape of an opening's questions and the checks on a
 * candidate's answers. Free of server-only imports so the form builder, the
 * public apply page and the API all share one set of rules.
 */
import {
  APPLICATION_STAGE,
  type ApplicationAnswer,
  FORM_FIELD_TYPE,
  type FormField,
} from '@/models/hiring';
import { isValidLink, splitLinkList, toHref } from './links';

export const MAX_FIELDS = 40;
export const MAX_OPTIONS = 30;
export const MAX_LABEL_LENGTH = 200;
export const MAX_SHORT_ANSWER = 500;
export const MAX_LONG_ANSWER = 5000;
export const MAX_DESCRIPTION_LENGTH = 20000;

/** Keeps a whole submission under the 4.5 MB request limit of the host. */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const ALLOWED_FILE_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'DOCX',
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
};
export const FILE_ACCEPT = Object.keys(ALLOWED_FILE_TYPES).join(',');

export const FIELD_TYPE_META: Record<
  FORM_FIELD_TYPE,
  { label: string; icon: string; hasOptions?: boolean }
> = {
  SHORT_TEXT: { label: 'Short answer', icon: 'short_text' },
  LONG_TEXT: { label: 'Paragraph', icon: 'notes' },
  EMAIL: { label: 'Email', icon: 'alternate_email' },
  PHONE: { label: 'Phone', icon: 'call' },
  URL: { label: 'Link', icon: 'link' },
  NUMBER: { label: 'Number', icon: 'pin' },
  DATE: { label: 'Date', icon: 'event' },
  SELECT: {
    label: 'One choice',
    icon: 'radio_button_checked',
    hasOptions: true,
  },
  MULTI_SELECT: { label: 'Many choices', icon: 'check_box', hasOptions: true },
  CHECKBOX: { label: 'Yes / no', icon: 'toggle_on' },
  FILE: { label: 'File upload', icon: 'upload_file' },
};

/** Pipeline order, used for the board columns and stage pickers. */
export const APPLICATION_STAGES: APPLICATION_STAGE[] = [
  APPLICATION_STAGE.APPLIED,
  APPLICATION_STAGE.SHORTLISTED,
  APPLICATION_STAGE.TASK,
  APPLICATION_STAGE.TASK_REVIEW,
  APPLICATION_STAGE.INTERVIEW,
  APPLICATION_STAGE.OFFER,
  APPLICATION_STAGE.HIRED,
  APPLICATION_STAGE.REJECTED,
];

export const EMPLOYMENT_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
  'Freelance',
];

const clip = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

export const newFieldId = () =>
  `f_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

const FIELD_ID_PATTERN = /^[a-zA-Z0-9_-]{1,40}$/;

/**
 * Cleans a form definition from an untrusted request: unknown types and empty
 * labels are dropped, ids are made unique, options are trimmed and limited.
 */
export function sanitizeFields(input: unknown): FormField[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: FormField[] = [];

  for (const raw of input.slice(0, MAX_FIELDS)) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const type = r.type as FORM_FIELD_TYPE;
    if (!Object.values(FORM_FIELD_TYPE).includes(type)) continue;
    const label = clip(r.label, MAX_LABEL_LENGTH);
    if (!label) continue;

    let id = typeof r.id === 'string' ? r.id : '';
    if (!FIELD_ID_PATTERN.test(id) || seen.has(id)) id = newFieldId();
    seen.add(id);

    const field: FormField = {
      id,
      label,
      type,
      required: r.required === true,
      placeholder: clip(r.placeholder, MAX_LABEL_LENGTH) || null,
      helpText: clip(r.helpText, MAX_SHORT_ANSWER) || null,
    };
    if (FIELD_TYPE_META[type].hasOptions) {
      const options = Array.isArray(r.options)
        ? Array.from(
            new Set(
              r.options.map((o) => clip(o, MAX_LABEL_LENGTH)).filter(Boolean),
            ),
          ).slice(0, MAX_OPTIONS)
        : [];
      if (!options.length) continue;
      field.options = options;
    }
    out.push(field);
  }
  return out;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+()\-.\s\d]{6,25}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isValidEmail = (value: string) =>
  value.length <= 254 && EMAIL_PATTERN.test(value);

/**
 * A link answer may hold several links, separated by spaces, commas or new
 * lines. Returns them as one comma separated list, with https:// added where
 * it was left out, or null when any of them is not a link.
 */
const cleanLinks = (value: string) => {
  const links = splitLinkList(value);
  if (!links.length || !links.every(isValidLink)) return null;
  return Array.from(new Set(links.map(toHref))).join(', ');
};

const isEmpty = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === '' ||
  value === false ||
  (Array.isArray(value) && value.length === 0);

/**
 * Checks the non-file answers against the form. Returns the cleaned answers
 * and a message per field that failed. File fields are only checked for
 * presence here; the server validates the upload itself.
 */
export function validateAnswers(
  fields: FormField[],
  raw: Record<string, unknown>,
  { filesPresent = [] as string[] } = {},
): {
  answers: Record<string, ApplicationAnswer>;
  errors: Record<string, string>;
} {
  const answers: Record<string, ApplicationAnswer> = {};
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = raw[field.id];

    if (field.type === FORM_FIELD_TYPE.FILE) {
      if (field.required && !filesPresent.includes(field.id))
        errors[field.id] = 'Please attach a file.';
      continue;
    }

    if (isEmpty(value)) {
      if (field.required)
        errors[field.id] =
          field.type === FORM_FIELD_TYPE.CHECKBOX
            ? 'Please tick this box.'
            : 'This question is required.';
      continue;
    }

    switch (field.type) {
      case FORM_FIELD_TYPE.CHECKBOX:
        answers[field.id] = value === true || value === 'true';
        break;
      case FORM_FIELD_TYPE.NUMBER: {
        const n = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(n)) errors[field.id] = 'Enter a number.';
        else answers[field.id] = n;
        break;
      }
      case FORM_FIELD_TYPE.SELECT: {
        const v = String(value);
        if (!field.options?.includes(v)) errors[field.id] = 'Pick an option.';
        else answers[field.id] = v;
        break;
      }
      case FORM_FIELD_TYPE.MULTI_SELECT: {
        const list = (Array.isArray(value) ? value : [value]).map(String);
        const valid = list.filter((v) => field.options?.includes(v));
        if (!valid.length) errors[field.id] = 'Pick at least one option.';
        else answers[field.id] = Array.from(new Set(valid));
        break;
      }
      default: {
        const max =
          field.type === FORM_FIELD_TYPE.LONG_TEXT
            ? MAX_LONG_ANSWER
            : MAX_SHORT_ANSWER;
        const text = clip(String(value), max);
        if (!text) {
          if (field.required) errors[field.id] = 'This question is required.';
          break;
        }
        if (field.type === FORM_FIELD_TYPE.EMAIL && !isValidEmail(text))
          errors[field.id] = 'Enter a valid email address.';
        else if (field.type === FORM_FIELD_TYPE.URL) {
          const links = cleanLinks(text);
          if (links) answers[field.id] = links;
          else
            errors[field.id] =
              'Enter a valid link, like https://example.com. Separate several links with commas or spaces.';
        } else if (
          field.type === FORM_FIELD_TYPE.PHONE &&
          !PHONE_PATTERN.test(text)
        )
          errors[field.id] = 'Enter a valid phone number.';
        else if (
          field.type === FORM_FIELD_TYPE.DATE &&
          !DATE_PATTERN.test(text)
        )
          errors[field.id] = 'Enter a date.';
        else answers[field.id] = text;
      }
    }
  }
  return { answers, errors };
}

/** The candidate's name and email, asked on every form. */
export function validateApplicant(raw: { name?: unknown; email?: unknown }) {
  const errors: Record<string, string> = {};
  const name = clip(raw.name, 120);
  const email = clip(raw.email, 254).toLowerCase();
  if (!name) errors.name = 'Please tell us your name.';
  if (!email) errors.email = 'Please enter your email.';
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  return { name, email, errors };
}

/** Readable text for an answer, used in tables and exports. */
export function answerText(value: ApplicationAnswer | undefined): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return value.name;
  return String(value);
}
