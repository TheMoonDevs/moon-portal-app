'use client';

import {
  FIELD_KINDS,
  FIELD_PRESETS,
  MAX_FIELDS,
} from '@/lib/agreements/fields';
import type { AgreementField, AgreementFieldKind } from '@/models/agreements';

import {
  AdminButton,
  Icon,
  IconAction,
  NativeSelect,
  TextInput,
} from '../shared/AdminUI';

/*
 * The details a signer fills in when they sign (an address, a PAN, bank
 * details, a tick box). Used when sending and in templates. Each field
 * belongs to one signer, by their place in the signer list.
 */

export type FieldDraft = Omit<AgreementField, 'id'> & { id?: string };

export const toDrafts = (fields: AgreementField[] | undefined): FieldDraft[] =>
  (fields ?? []).map((f) => ({ ...f }));

export const FieldsEditor = ({
  fields,
  onChange,
  parties,
  disabled,
}: {
  fields: FieldDraft[];
  onChange: (fields: FieldDraft[]) => void;
  /** Names (or roles) of the signers, in order; at least one. */
  parties: string[];
  disabled?: boolean;
}) => {
  const set = (i: number, patch: Partial<FieldDraft>) =>
    onChange(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const used = new Set(fields.map((f) => f.id).filter(Boolean));
  const presets = FIELD_PRESETS.filter((p) => !used.has(p.id));
  const full = fields.length >= MAX_FIELDS;

  return (
    <div className="flex flex-col gap-2">
      {fields.map((f, i) => (
        <div
          key={i}
          className="grid items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5 sm:grid-cols-[minmax(0,1fr)_150px_140px_auto_auto]"
        >
          <TextInput
            aria-label="What they fill in"
            placeholder="What they fill in, e.g. PAN"
            value={f.label}
            disabled={disabled}
            onChange={(e) => set(i, { label: e.target.value })}
          />
          <NativeSelect
            aria-label="Kind of answer"
            value={f.kind}
            disabled={disabled}
            onChange={(e) =>
              set(i, { kind: e.target.value as AgreementFieldKind })
            }
          >
            {FIELD_KINDS.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.label}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Who fills it in"
            value={String(Math.min(f.signer, parties.length))}
            disabled={disabled || parties.length < 2}
            onChange={(e) => set(i, { signer: Number(e.target.value) })}
          >
            {parties.map((p, n) => (
              <option key={n} value={n + 1}>
                {p}
              </option>
            ))}
          </NativeSelect>
          <label className="flex items-center gap-1.5 whitespace-nowrap px-1 text-xs text-neutral-400">
            <input
              type="checkbox"
              checked={f.required}
              disabled={disabled}
              onChange={(e) => set(i, { required: e.target.checked })}
              className="accent-emerald-500"
            />
            Required
          </label>
          <IconAction
            icon="close"
            label="Remove"
            disabled={disabled}
            onClick={() => onChange(fields.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      {!disabled && !full && (
        <div className="flex flex-wrap items-center gap-1.5">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange([...fields, { ...p, signer: 1 }])}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 text-[11px] text-neutral-300 hover:border-white/20 hover:bg-white/[0.07]"
            >
              <Icon name="add" className="text-[14px]" />
              {p.label.length > 28 ? `${p.label.slice(0, 26)}…` : p.label}
            </button>
          ))}
          <AdminButton
            size="sm"
            tone="ghost"
            icon="add"
            onClick={() =>
              onChange([
                ...fields,
                { label: '', kind: 'text', required: true, signer: 1 },
              ])
            }
          >
            Your own
          </AdminButton>
        </div>
      )}
    </div>
  );
};
