/**
 * Bringing applicants in from an earlier spreadsheet, usually the response
 * sheet of a Google Form downloaded as CSV. The hiring tab reads the file and
 * matches its columns to the opening's questions here; the server and the
 * Claude connector share the answer conversion.
 */
import {
  APPLICATION_STAGE,
  type ApplicationAnswer,
  FORM_FIELD_TYPE,
  type FormField,
} from '@/models/hiring';

import { MAX_LONG_ANSWER } from './forms';

/** Rows sent in one request; the hiring tab splits bigger files. */
export const MAX_IMPORT_ROWS = 500;
/** Rows the hiring tab reads from one file. */
export const MAX_FILE_ROWS = 5000;

/** One applicant to import, as the server accepts it. */
export interface ImportRow {
  name?: unknown;
  email?: unknown;
  /** When they applied: an ISO date, or anything Date can read. */
  submittedAt?: unknown;
  /** A stage, or words like "Rejected" or "Interview round 2". */
  stage?: unknown;
  notes?: unknown;
  /** By question id, or by question label from the connector. */
  answers?: Record<string, unknown>;
}

/* ----------------------------------- CSV ---------------------------------- */

/** Reads CSV text (RFC 4180: quoted fields, "" escapes, line breaks). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const input = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/* --------------------------------- columns -------------------------------- */

export type ImportTarget =
  | 'skip'
  | 'name'
  | 'email'
  | 'submittedAt'
  | 'stage'
  | 'notes'
  | `field:${string}`;

export const normalizeLabel = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '');

const NAME_HEADERS = [
  'name',
  'fullname',
  'yourname',
  'yourfullname',
  'candidatename',
  'applicantname',
  'nameofthecandidate',
  'nameoftheapplicant',
];
const FIRST_NAME_HEADERS = ['firstname', 'givenname'];
const LAST_NAME_HEADERS = ['lastname', 'surname', 'familyname'];
const EMAIL_HEADERS = [
  'emailaddress',
  'email',
  'emailid',
  'mailid',
  'youremail',
  'youremailaddress',
  'youremailid',
];
const DATE_HEADERS = [
  'timestamp',
  'submittedat',
  'submittedon',
  'submissiondate',
  'appliedon',
  'appliedat',
  'dateapplied',
  'applicationdate',
];
const STAGE_HEADERS = [
  'stage',
  'status',
  'applicationstatus',
  'currentstatus',
  'hiringstatus',
  'result',
  'decision',
];
/**
 * A first guess at where each column goes: questions by matching label,
 * then the usual names of Google Forms' columns. Anything left over goes to
 * the notes, so nothing from the sheet is lost.
 */
export function suggestTargets(
  headers: string[],
  fields: FormField[],
): ImportTarget[] {
  const keys = headers.map(normalizeLabel);
  const byLabel = new Map(fields.map((f) => [normalizeLabel(f.label), f.id]));
  const targets = keys.map(
    (key): ImportTarget =>
      byLabel.has(key) ? `field:${byLabel.get(key)}` : 'skip',
  );
  const claim = (target: ImportTarget, names: string[]) => {
    if (targets.includes(target)) return;
    const index = keys.findIndex(
      (key, i) => targets[i] === 'skip' && names.includes(key),
    );
    if (index >= 0) targets[index] = target;
  };

  claim('email', EMAIL_HEADERS);
  if (!targets.includes('email')) {
    const index = keys.findIndex(
      (key, i) => targets[i] === 'skip' && key.includes('email'),
    );
    if (index >= 0) targets[index] = 'email';
  }
  claim('name', NAME_HEADERS);
  if (!targets.includes('name')) {
    const first = keys.findIndex(
      (key, i) => targets[i] === 'skip' && FIRST_NAME_HEADERS.includes(key),
    );
    const last = keys.findIndex(
      (key, i) => targets[i] === 'skip' && LAST_NAME_HEADERS.includes(key),
    );
    if (first >= 0) targets[first] = 'name';
    if (first >= 0 && last >= 0) targets[last] = 'name';
  }
  if (!targets.includes('name')) {
    // Longer wordings, like "Your Full Legal Name".
    const index = keys.findIndex(
      (key, i) => targets[i] === 'skip' && /fullname|legalname/.test(key),
    );
    if (index >= 0) targets[index] = 'name';
  }
  claim('submittedAt', DATE_HEADERS);
  claim('stage', STAGE_HEADERS);
  headers.forEach((header, i) => {
    if (targets[i] === 'skip' && header.trim()) targets[i] = 'notes';
  });
  return targets;
}

/* ---------------------------------- dates --------------------------------- */

export type DateOrder = 'DMY' | 'MDY';

const DATE_PATTERN =
  /^(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})(?:[,\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap])?\.?m?\.?)?/i;

/**
 * Which way round a column's dates are written. Sheets export dates in the
 * owner's locale, so "03/04/2025" can be either; a day above 12 settles it.
 * Null when every date fits both ways.
 */
export function detectDateOrder(values: string[]): DateOrder | null {
  for (const value of values) {
    const m = DATE_PATTERN.exec(value.trim());
    if (!m || m[1].length === 4) continue;
    if (Number(m[1]) > 12) return 'DMY';
    if (Number(m[2]) > 12) return 'MDY';
  }
  return null;
}

type DateParts = {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
  s: number;
};

function dateParts(value: string, order: DateOrder): DateParts | null {
  const m = DATE_PATTERN.exec(value.trim());
  if (!m) return null;
  let [y, mo, d] = [Number(m[3]), Number(m[2]), Number(m[1])];
  if (m[1].length === 4)
    [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else if (order === 'MDY') [mo, d] = [Number(m[1]), Number(m[2])];
  if (y < 100) y += 2000;
  let h = Number(m[4] ?? 0);
  const pm = m[7]?.toLowerCase();
  if (pm === 'p' && h < 12) h += 12;
  if (pm === 'a' && h === 12) h = 0;
  const parts = { y, mo, d, h, mi: Number(m[5] ?? 0), s: Number(m[6] ?? 0) };
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || parts.mi > 59)
    return null;
  return parts;
}

/** A sheet's date and time, read as local time, as an ISO string. */
export function sheetDateToIso(value: string, order: DateOrder): string | null {
  const parts = dateParts(value, order);
  if (parts) {
    const date = new Date(
      parts.y,
      parts.mo - 1,
      parts.d,
      parts.h,
      parts.mi,
      parts.s,
    );
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

/** A sheet's date as YYYY-MM-DD, for date questions. */
export function sheetDateToDay(value: string, order: DateOrder): string | null {
  const parts = dateParts(value, order);
  if (!parts) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parts.y}-${pad(parts.mo)}-${pad(parts.d)}`;
}

/* --------------------------------- values --------------------------------- */

/** The stage that words like "Rejected" or "HR round" describe. */
export function stageFromText(value: unknown): APPLICATION_STAGE | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().toLowerCase();
  if (!text) return null;
  const upper = text.toUpperCase().replace(/\s+/g, '_');
  if (Object.values(APPLICATION_STAGE).includes(upper as APPLICATION_STAGE))
    return upper as APPLICATION_STAGE;
  if (
    /reject|declin|not\s*selected|not\s*a\s*fit|withdr|dropped|no\s*show/.test(
      text,
    )
  )
    return APPLICATION_STAGE.REJECTED;
  if (/hired|joined|onboard|offer\s*accepted/.test(text))
    return APPLICATION_STAGE.HIRED;
  if (/offer/.test(text)) return APPLICATION_STAGE.OFFER;
  if (/interview|round|call\b|meeting/.test(text))
    return APPLICATION_STAGE.INTERVIEW;
  if (/task|assignment|assessment|test|challenge/.test(text))
    return APPLICATION_STAGE.TASK;
  if (/shortlist|selected|screened|qualified/.test(text))
    return APPLICATION_STAGE.SHORTLISTED;
  if (/applied|new|pending|received|in\s*review|to\s*review/.test(text))
    return APPLICATION_STAGE.APPLIED;
  return null;
}

/**
 * Splits a checkbox answer. Google Forms joins choices with ", ", and a
 * choice can hold a comma itself, so known options are matched first.
 */
function splitChoices(text: string, options: string[]): string[] {
  const parts = text.split(/,\s*/);
  const out: string[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    let match = -1;
    for (let j = parts.length; j > i + 1; j -= 1)
      if (options.includes(parts.slice(i, j).join(', '))) {
        match = j;
        break;
      }
    if (match > 0) {
      out.push(parts.slice(i, match).join(', '));
      i = match - 1;
    } else if (parts[i].trim()) out.push(parts[i].trim());
  }
  return Array.from(new Set(out));
}

/**
 * An imported answer for `field`. Unlike the apply page this keeps what the
 * sheet says even when it no longer fits the form (an old choice, a date
 * written as text), so an earlier answer is never thrown away.
 */
export function importAnswer(
  field: FormField,
  value: unknown,
): ApplicationAnswer | null {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) {
    const list = value
      .map((v) => String(v).trim().slice(0, MAX_LONG_ANSWER))
      .filter(Boolean);
    if (!list.length) return null;
    return field.type === FORM_FIELD_TYPE.MULTI_SELECT ? list : list.join(', ');
  }
  if (typeof value === 'boolean')
    return field.type === FORM_FIELD_TYPE.CHECKBOX
      ? value
      : value
        ? 'Yes'
        : 'No';
  if (typeof value === 'number')
    return field.type === FORM_FIELD_TYPE.NUMBER ? value : String(value);

  const text = String(value).trim().slice(0, MAX_LONG_ANSWER);
  if (!text) return null;
  switch (field.type) {
    case FORM_FIELD_TYPE.NUMBER: {
      const n = Number(text.replace(/,/g, ''));
      return Number.isFinite(n) ? n : text;
    }
    case FORM_FIELD_TYPE.CHECKBOX:
      return !/^(no|n|false|0|unchecked|not checked)$/i.test(text);
    case FORM_FIELD_TYPE.MULTI_SELECT:
      return splitChoices(text, field.options ?? []);
    default:
      return text;
  }
}
