'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  EMPLOYMENT_TYPES,
  FIELD_TYPE_META,
  MAX_FIELDS,
  newFieldId,
} from '@/lib/hiring/forms';
import { cn } from '@/lib/utils';
import {
  FORM_FIELD_TYPE,
  type FormField,
  JOB_OPENING_STATUS,
} from '@/models/hiring';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  Field,
  Icon,
  IconAction,
  NativeSelect,
  Segmented,
  TextArea,
  TextInput,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import {
  OPENING_STATUS_META,
  type OpeningRow,
  QUESTION_PRESETS,
} from './hiringMeta';

type DraftField = FormField & { optionsText?: string };

const emptyDraft = {
  title: '',
  department: '',
  location: '',
  employmentType: 'Full-time',
  description: '',
  details: '',
  notes: '',
  status: JOB_OPENING_STATUS.DRAFT as JOB_OPENING_STATUS,
  fields: [] as DraftField[],
};

const toDraftField = (field: FormField): DraftField => ({
  ...field,
  optionsText: (field.options ?? []).join('\n'),
});

const QuestionRow = ({
  field,
  index,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  field: DraftField;
  index: number;
  count: number;
  onChange: (field: DraftField) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) => {
  const meta = FIELD_TYPE_META[field.type];
  const [showMore, setShowMore] = useState(!!field.helpText);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[18px] text-neutral-400">
          <Icon name={meta.icon} />
        </span>
        <TextInput
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          placeholder="Question"
          className="min-w-[180px] flex-1"
        />
        <NativeSelect
          aria-label="Answer type"
          value={field.type}
          onChange={(e) =>
            onChange({ ...field, type: e.target.value as FORM_FIELD_TYPE })
          }
          className="w-40"
        >
          {Object.entries(FIELD_TYPE_META).map(([type, m]) => (
            <option key={type} value={type}>
              {m.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      {meta.hasOptions && (
        <Field label="Choices" hint="One per line.">
          <TextArea
            value={field.optionsText ?? ''}
            onChange={(e) =>
              onChange({ ...field, optionsText: e.target.value })
            }
            placeholder={'Option one\nOption two'}
            className="min-h-[72px]"
          />
        </Field>
      )}
      {field.type === FORM_FIELD_TYPE.CHECKBOX && (
        <Field label="Statement to tick">
          <TextInput
            value={field.placeholder ?? ''}
            onChange={(e) =>
              onChange({ ...field, placeholder: e.target.value })
            }
            placeholder="I agree to the privacy policy"
          />
        </Field>
      )}
      {showMore && (
        <Field label="Help text">
          <TextInput
            value={field.helpText ?? ''}
            onChange={(e) => onChange({ ...field, helpText: e.target.value })}
            placeholder="Shown under the question"
          />
        </Field>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...field, required: !field.required })}
            className={cn(
              'rounded-md border px-2 py-1 text-xs transition-colors',
              field.required
                ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                : 'border-white/10 text-neutral-500 hover:text-neutral-300',
            )}
          >
            {field.required ? 'Required' : 'Optional'}
          </button>
          {!showMore && (
            <button
              type="button"
              onClick={() => setShowMore(true)}
              className="text-xs text-neutral-500 hover:text-neutral-300"
            >
              Add help text
            </button>
          )}
        </div>
        <div className="flex items-center">
          <IconAction
            icon="arrow_upward"
            label="Move up"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          />
          <IconAction
            icon="arrow_downward"
            label="Move down"
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          />
          <IconAction
            icon="delete"
            label="Remove question"
            tone="danger"
            onClick={onRemove}
          />
        </div>
      </div>
    </div>
  );
};

export const OpeningEditor = ({
  open,
  onOpenChange,
  companyId,
  opening,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  opening: OpeningRow | null;
  onSaved: (opening: OpeningRow) => void;
}) => {
  const [draft, setDraft] = useState(emptyDraft);
  const [section, setSection] = useState<'details' | 'form'>('details');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSection('details');
    setDraft(
      opening
        ? {
            title: opening.title,
            department: opening.department ?? '',
            location: opening.location ?? '',
            employmentType: opening.employmentType ?? '',
            description: opening.description ?? '',
            details: opening.details ?? '',
            notes: opening.notes ?? '',
            status: opening.status,
            fields: (opening.fields ?? []).map(toDraftField),
          }
        : {
            ...emptyDraft,
            fields: [
              {
                id: newFieldId(),
                label: 'Resume / CV',
                type: FORM_FIELD_TYPE.FILE,
                required: true,
              },
            ],
          },
    );
  }, [open, opening]);

  const set = <K extends keyof typeof emptyDraft>(
    key: K,
    value: (typeof emptyDraft)[K],
  ) => setDraft((d) => ({ ...d, [key]: value }));

  const setFields = (update: (fields: DraftField[]) => DraftField[]) =>
    setDraft((d) => ({ ...d, fields: update(d.fields) }));

  const addField = (field: Omit<DraftField, 'id'>) => {
    if (draft.fields.length >= MAX_FIELDS)
      return toast.error(`A form can have up to ${MAX_FIELDS} questions.`);
    setFields((fields) => [
      ...fields,
      toDraftField({ ...field, id: newFieldId() }),
    ]);
  };

  const save = async () => {
    if (!draft.title.trim()) {
      setSection('details');
      return toast.error('Give the opening a title.');
    }
    const fields: FormField[] = draft.fields.map(
      ({ optionsText, ...field }) => ({
        ...field,
        options: FIELD_TYPE_META[field.type].hasOptions
          ? (optionsText ?? '')
              .split('\n')
              .map((o) => o.trim())
              .filter(Boolean)
          : undefined,
      }),
    );
    const unlabelled = fields.findIndex((f) => !f.label.trim());
    if (unlabelled >= 0) {
      setSection('form');
      return toast.error(`Question ${unlabelled + 1} needs a label.`);
    }
    const noChoices = fields.find(
      (f) => FIELD_TYPE_META[f.type].hasOptions && !f.options?.length,
    );
    if (noChoices) {
      setSection('form');
      return toast.error(`Add choices to “${noChoices.label}”.`);
    }

    setSaving(true);
    try {
      const payload = { ...draft, fields };
      const res = opening
        ? await PortalSdk.patchData(
            `/api/hiring/openings/${opening.id}`,
            payload,
          )
        : await PortalSdk.postData('/api/hiring/openings', {
            ...payload,
            companyId,
          });
      toast.success(opening ? 'Opening saved' : 'Opening created');
      onSaved(res.data.opening);
      onOpenChange(false);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      icon="work"
      title={opening ? 'Edit opening' : 'New opening'}
      description="Candidates always give their name and email; add any other questions below."
      footer={
        <>
          <AdminButton
            tone="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </AdminButton>
          <AdminButton tone="primary" size="sm" loading={saving} onClick={save}>
            {opening ? 'Save' : 'Create opening'}
          </AdminButton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Segmented
          value={section}
          onChange={setSection}
          options={[
            { value: 'details', label: 'Details', icon: 'description' },
            {
              value: 'form',
              label: 'Application form',
              icon: 'list_alt',
              count: draft.fields.length,
            },
          ]}
        />

        {section === 'details' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title" required className="md:col-span-2">
              <TextInput
                autoFocus
                value={draft.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Senior React developer"
              />
            </Field>
            <Field label="Department">
              <TextInput
                value={draft.department}
                onChange={(e) => set('department', e.target.value)}
                placeholder="Engineering"
              />
            </Field>
            <Field label="Location">
              <TextInput
                value={draft.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="Remote, India"
              />
            </Field>
            <Field label="Employment type">
              <NativeSelect
                value={draft.employmentType}
                onChange={(e) => set('employmentType', e.target.value)}
              >
                <option value="">Not specified</option>
                {EMPLOYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              label="Status"
              hint={OPENING_STATUS_META[draft.status]?.hint}
            >
              <NativeSelect
                value={draft.status}
                onChange={(e) =>
                  set('status', e.target.value as JOB_OPENING_STATUS)
                }
              >
                {[
                  JOB_OPENING_STATUS.DRAFT,
                  JOB_OPENING_STATUS.OPEN,
                  JOB_OPENING_STATUS.CLOSED,
                ].map((status) => (
                  <option key={status} value={status}>
                    {OPENING_STATUS_META[status].label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              label="Summary"
              className="md:col-span-2"
              hint="A few lines at the top of the apply page."
            >
              <TextArea
                value={draft.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Who you are and what the role is, in two or three sentences."
                className="min-h-[110px]"
              />
            </Field>
            <Field
              label="Full details"
              className="md:col-span-2"
              hint="Shown below the summary, where candidates can read more. Start lines with - or * for bullets; a short line above them becomes a heading, and **text** is bold."
            >
              <TextArea
                value={draft.details}
                onChange={(e) => set('details', e.target.value)}
                placeholder={
                  'Requirements\n- …\n\nResponsibilities\n- …\n\nPay and perks\n- …'
                }
                className="min-h-[200px]"
              />
            </Field>
            <Field
              label={
                <>
                  <Icon name="lock" className="text-[14px]" />
                  Internal notes
                </>
              }
              className="md:col-span-2"
              hint="Only the hiring team sees these: budget, who interviews, what to look for."
            >
              <TextArea
                value={draft.notes}
                onChange={(e) => set('notes', e.target.value)}
                className="min-h-[110px]"
              />
            </Field>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-sm text-neutral-400">
              <span className="flex items-center gap-2">
                <Icon name="lock" className="text-[16px]" />
                Full name and email are always asked first.
              </span>
            </div>

            {draft.fields.map((field, index) => (
              <QuestionRow
                key={field.id}
                field={field}
                index={index}
                count={draft.fields.length}
                onChange={(next) =>
                  setFields((fields) =>
                    fields.map((f) => (f.id === field.id ? next : f)),
                  )
                }
                onMove={(direction) =>
                  setFields((fields) => {
                    const next = [...fields];
                    const target = index + direction;
                    [next[index], next[target]] = [next[target], next[index]];
                    return next;
                  })
                }
                onRemove={() =>
                  setFields((fields) => fields.filter((f) => f.id !== field.id))
                }
              />
            ))}

            <div className="flex flex-col gap-2">
              <AdminButton
                size="sm"
                icon="add"
                className="self-start"
                onClick={() =>
                  addField({
                    label: '',
                    type: FORM_FIELD_TYPE.SHORT_TEXT,
                    required: false,
                  })
                }
              >
                Add question
              </AdminButton>
              <p className="pt-2 text-xs uppercase tracking-wide text-neutral-500">
                Common questions
              </p>
              <div className="flex flex-wrap gap-2">
                {QUESTION_PRESETS.filter(
                  (preset) =>
                    !draft.fields.some((f) => f.label === preset.label),
                ).map((preset) => (
                  <button
                    type="button"
                    key={preset.label}
                    onClick={() => addField(preset)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-neutral-400 transition-colors hover:border-white/20 hover:text-neutral-100"
                  >
                    <Icon
                      name={FIELD_TYPE_META[preset.type].icon}
                      className="text-[14px]"
                    />
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminModal>
  );
};
