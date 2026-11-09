/*
 * Fillable fields: what a signer fills in before they sign (an address, a
 * PAN, bank details, a tick in a box). Client-safe.
 *
 * Fields live next to the text, not inside it: the text is frozen and
 * hashed when it goes out, and what each signer fills in is saved with their
 * signature and printed in the signed PDF under their name.
 */
import type {
  AgreementField,
  AgreementFieldKind,
  AgreementSigner,
} from '@/models/agreements';

export const MAX_FIELDS = 20;
const MAX_LABEL = 80;
const MAX_HINT = 160;

export const FIELD_KINDS: Array<{ kind: AgreementFieldKind; label: string }> = [
  { kind: 'text', label: 'Short answer' },
  { kind: 'longtext', label: 'Long answer' },
  { kind: 'date', label: 'Date' },
  { kind: 'checkbox', label: 'Tick box' },
];

export const isFieldKind = (v: unknown): v is AgreementFieldKind =>
  FIELD_KINDS.some((k) => k.kind === v);

/** The fields HR asks for most, one click to add. */
export const FIELD_PRESETS: Array<Omit<AgreementField, 'signer'>> = [
  {
    id: 'address',
    label: 'Home address',
    kind: 'longtext',
    required: true,
  },
  {
    id: 'pan',
    label: 'PAN',
    kind: 'text',
    required: true,
    hint: 'As on your PAN card, e.g. ABCDE1234F',
  },
  {
    id: 'bankAccount',
    label: 'Bank account number',
    kind: 'text',
    required: true,
  },
  { id: 'ifsc', label: 'IFSC code', kind: 'text', required: true },
  {
    id: 'emergencyContact',
    label: 'Emergency contact (name and phone)',
    kind: 'text',
    required: true,
  },
  { id: 'dateOfBirth', label: 'Date of birth', kind: 'date', required: false },
  {
    id: 'readPolicies',
    label: 'I have read the policies linked above',
    kind: 'checkbox',
    required: true,
  },
];

/** Presets that hold financial or ID details: worth keeping confidential. */
export const SENSITIVE_FIELD_IDS = new Set(['pan', 'bankAccount', 'ifsc']);

export const isSensitiveField = (f: Pick<AgreementField, 'id' | 'label'>) =>
  SENSITIVE_FIELD_IDS.has(f.id) ||
  /\b(pan|aadhaar|bank|ifsc|account number|passport|ssn)\b/i.test(f.label);

const slug = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)?/g, (_, c: string | undefined) =>
      c ? c.toUpperCase() : '',
    )
    .replace(/^[^a-z]+/, '')
    .slice(0, 40) || 'field';

/** Fields from an untrusted list, each checked; ids made unique. */
export function parseFields(raw: unknown, maxSigner = 10): AgreementField[] {
  if (!Array.isArray(raw)) return [];
  const used = new Set<string>();
  const out: AgreementField[] = [];
  for (const r of raw.slice(0, MAX_FIELDS)) {
    if (!r || typeof r !== 'object') continue;
    const f = r as Record<string, unknown>;
    const label =
      typeof f.label === 'string' ? f.label.trim().slice(0, MAX_LABEL) : '';
    if (!label) continue;
    const kind = isFieldKind(f.kind) ? f.kind : 'text';
    let id =
      typeof f.id === 'string' && /^[A-Za-z][\w]{0,39}$/.test(f.id)
        ? f.id
        : slug(label);
    for (let i = 2; used.has(id); i++) id = `${id.replace(/\d+$/, '')}${i}`;
    used.add(id);
    const signer = Number(f.signer);
    out.push({
      id,
      label,
      kind,
      required: f.required !== false,
      signer:
        Number.isInteger(signer) && signer >= 1 && signer <= maxSigner
          ? signer
          : 1,
      hint:
        typeof f.hint === 'string' && f.hint.trim()
          ? f.hint.trim().slice(0, MAX_HINT)
          : null,
    });
  }
  return out;
}

/** The parties (not the company's signer) in the order they were listed. */
export const partiesOf = (signers: AgreementSigner[]) =>
  signers.filter((s) => !s.company);

/** The fields one signer fills in. */
export function fieldsFor(
  fields: AgreementField[] | null | undefined,
  signers: AgreementSigner[],
  signerId: string,
) {
  const index = partiesOf(signers).findIndex((s) => s.id === signerId);
  if (index < 0) return [];
  return (fields ?? []).filter((f) => f.signer === index + 1);
}

const maxLength = (kind: AgreementFieldKind) =>
  kind === 'longtext' ? 2000 : kind === 'checkbox' ? 3 : 300;

/**
 * A signer's answers, checked against their fields. Throws a message naming
 * the first field that is missing or wrong.
 */
export function checkValues(
  fields: AgreementField[],
  raw: unknown,
): Record<string, string> {
  const given =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: Record<string, string> = {};
  for (const f of fields) {
    const v = given[f.id];
    let value = '';
    if (f.kind === 'checkbox')
      value = v === true || v === 'yes' || v === 'true' ? 'yes' : '';
    else if (typeof v === 'string')
      value = v.trim().slice(0, maxLength(f.kind));
    if (f.kind === 'date' && value && !/^\d{4}-\d{2}-\d{2}$/.test(value))
      throw new Error(`${f.label}: pick a date.`);
    if (f.required && !value)
      throw new Error(
        f.kind === 'checkbox'
          ? `Tick “${f.label}” first.`
          : `Fill in ${f.label}.`,
      );
    if (value) out[f.id] = value;
  }
  return out;
}

/** How an answer reads in the PDF and on the page. */
export function fieldText(f: AgreementField, value: string | undefined) {
  if (f.kind === 'checkbox')
    return value === 'yes' ? 'Yes, ticked' : 'Not ticked';
  if (!value) return '—';
  if (f.kind === 'date') {
    const d = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(d.getTime())
      ? value
      : d.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        });
  }
  return value;
}
