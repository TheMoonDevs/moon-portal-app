/* eslint-disable @next/next/no-img-element */
'use client';

import { useRef, useState } from 'react';

import {
  FILE_ACCEPT,
  MAX_FILE_BYTES,
  validateAnswers,
  validateApplicant,
} from '@/lib/hiring/forms';
import { cn } from '@/lib/utils';
import { FORM_FIELD_TYPE, type FormField } from '@/models/hiring';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';

import {
  AdminButton,
  CheckBox,
  DateInput,
  Field,
  Icon,
  NativeSelect,
  TextArea,
  TextInput,
} from '../Admin/shared/AdminUI';
import { JobDetails, JobText } from './JobText';

/** What a candidate may see of an opening. */
export interface PublicOpening {
  slug: string;
  title: string;
  department: string | null;
  location: string | null;
  employmentType: string | null;
  /** A short summary, shown in the header. */
  description: string | null;
  /** The rest of the job post, shown below the header. */
  details: string | null;
  isOpen: boolean;
  fields: FormField[];
  company: { name: string; logo: string | null; color: string | null };
}

type Answers = Record<string, string | string[] | boolean>;

const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const FileInput = ({
  file,
  onChange,
  invalid,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  invalid?: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-dashed px-3 py-3',
        invalid ? 'border-rose-500/40' : 'border-white/15',
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[20px] text-neutral-300">
        <Icon name={file ? 'description' : 'upload_file'} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-neutral-200">
          {file ? file.name : 'No file chosen'}
        </p>
        <p className="text-xs text-neutral-500">
          {file
            ? formatBytes(file.size)
            : `PDF, Word or image, up to ${MAX_FILE_BYTES / 1024 / 1024} MB`}
        </p>
      </div>
      {file && (
        <AdminButton
          type="button"
          tone="ghost"
          size="sm"
          onClick={() => {
            onChange(null);
            if (inputRef.current) inputRef.current.value = '';
          }}
        >
          Remove
        </AdminButton>
      )}
      <AdminButton
        type="button"
        size="sm"
        onClick={() => inputRef.current?.click()}
      >
        {file ? 'Replace' : 'Choose file'}
      </AdminButton>
      <input
        ref={inputRef}
        type="file"
        accept={FILE_ACCEPT}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
};

const Question = ({
  field,
  value,
  file,
  error,
  onChange,
  onFile,
}: {
  field: FormField;
  value: Answers[string] | undefined;
  file: File | null;
  error?: string;
  onChange: (value: Answers[string]) => void;
  onFile: (file: File | null) => void;
}) => {
  const id = `q-${field.id}`;
  const text = typeof value === 'string' ? value : '';
  const common = {
    id,
    placeholder: field.placeholder ?? undefined,
    'aria-invalid': !!error,
    className: cn(error && 'border-rose-500/40'),
  };

  const control = (() => {
    switch (field.type) {
      case FORM_FIELD_TYPE.LONG_TEXT:
        return (
          <TextArea
            {...common}
            rows={5}
            value={text}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case FORM_FIELD_TYPE.DATE:
        return (
          <DateInput
            {...common}
            value={text}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case FORM_FIELD_TYPE.SELECT:
        return (
          <NativeSelect
            id={id}
            value={text}
            onChange={(e) => onChange(e.target.value)}
            className={common.className}
          >
            <option value="">Choose one</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </NativeSelect>
        );
      case FORM_FIELD_TYPE.MULTI_SELECT: {
        const selected = Array.isArray(value) ? value : [];
        return (
          <div className="flex flex-wrap gap-2">
            {field.options?.map((option) => {
              const checked = selected.includes(option);
              return (
                <button
                  type="button"
                  key={option}
                  onClick={() =>
                    onChange(
                      checked
                        ? selected.filter((o) => o !== option)
                        : [...selected, option],
                    )
                  }
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                    checked
                      ? 'border-white/30 bg-white/[0.08] text-white'
                      : 'border-white/10 text-neutral-400 hover:text-neutral-200',
                  )}
                >
                  <CheckBox checked={checked} size="sm" />
                  {option}
                </button>
              );
            })}
          </div>
        );
      }
      case FORM_FIELD_TYPE.CHECKBOX:
        return (
          <button
            type="button"
            onClick={() => onChange(!value)}
            className="flex items-center gap-3 text-left text-sm text-neutral-300"
          >
            <CheckBox checked={value === true} />
            {field.placeholder || 'Yes'}
          </button>
        );
      case FORM_FIELD_TYPE.FILE:
        return <FileInput file={file} onChange={onFile} invalid={!!error} />;
      default:
        return (
          <TextInput
            {...common}
            type={
              field.type === FORM_FIELD_TYPE.EMAIL
                ? 'email'
                : field.type === FORM_FIELD_TYPE.URL
                  ? 'url'
                  : field.type === FORM_FIELD_TYPE.PHONE
                    ? 'tel'
                    : field.type === FORM_FIELD_TYPE.NUMBER
                      ? 'number'
                      : 'text'
            }
            value={text}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  })();

  return (
    <Field
      label={field.label}
      htmlFor={id}
      required={field.required}
      hint={field.helpText}
      error={error}
    >
      {control}
    </Field>
  );
};

export const ApplyPage = ({ opening }: { opening: PublicOpening }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [answers, setAnswers] = useState<Answers>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const clearError = (key: string) =>
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const attached = Object.entries(files)
      .filter(([, f]) => !!f)
      .map(([id]) => id);
    const local = {
      ...validateApplicant({ name, email }).errors,
      ...validateAnswers(opening.fields, answers, { filesPresent: attached })
        .errors,
    };
    for (const [id, file] of Object.entries(files)) {
      if (file && file.size > MAX_FILE_BYTES)
        local[id] = `Files can be up to ${MAX_FILE_BYTES / 1024 / 1024} MB.`;
    }
    setErrors(local);
    if (Object.keys(local).length) {
      setFormError('Please fix the highlighted answers.');
      return;
    }

    const body = new FormData();
    body.set('payload', JSON.stringify({ name, email, answers, website }));
    for (const [id, file] of Object.entries(files))
      if (file) body.set(`file:${id}`, file);

    setSubmitting(true);
    try {
      const res = await fetch(`/api/hiring/apply/${opening.slug}`, {
        method: 'POST',
        headers: { tmd_portal_api_key: TMD_PORTAL_API_KEY },
        body,
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok) {
        setSubmitted(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (result?.errors) setErrors(result.errors);
      setFormError(
        result?.error ||
          (res.status === 413
            ? 'Your files are too large. Try a smaller file.'
            : 'Something went wrong. Please try again.'),
      );
    } catch {
      setFormError('We could not reach the server. Check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const meta = [
    opening.department,
    opening.location,
    opening.employmentType,
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:py-16">
        <header className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            {opening.company.logo ? (
              <img
                src={opening.company.logo}
                alt=""
                className="size-10 rounded-xl object-cover"
              />
            ) : (
              <span
                className="flex size-10 items-center justify-center rounded-xl text-lg font-bold text-white"
                style={{ backgroundColor: opening.company.color || '#404040' }}
              >
                {opening.company.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <p className="text-sm font-medium text-neutral-300">
              {opening.company.name}
            </p>
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {opening.title}
            </h1>
            {meta.length > 0 && (
              <p className="mt-2 text-sm text-neutral-400">
                {meta.join(' · ')}
              </p>
            )}
          </div>
          {opening.description && <JobText text={opening.description} />}
        </header>

        {opening.details && <JobDetails text={opening.details} />}

        {submitted ? (
          <section className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-[26px] text-emerald-300">
              <Icon name="check" />
            </span>
            <h2 className="text-lg font-semibold text-white">
              Application sent
            </h2>
            <p className="max-w-sm text-sm text-neutral-400">
              Thanks, {name.split(' ')[0] || 'there'}. The team at{' '}
              {opening.company.name} will review it and get back to you at{' '}
              {email}.
            </p>
          </section>
        ) : !opening.isOpen ? (
          <section className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-4 text-sm text-neutral-400">
            <Icon name="lock" className="text-[18px]" />
            This opening is no longer taking applications.
          </section>
        ) : (
          <form
            noValidate
            onSubmit={submit}
            className="flex flex-col gap-5 rounded-2xl border border-white/[0.07] bg-neutral-900/40 p-5 sm:p-6"
          >
            <h2 className="text-base font-semibold text-white">Apply</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Full name"
                htmlFor="q-name"
                required
                error={errors.name}
              >
                <TextInput
                  id="q-name"
                  aria-invalid={!!errors.name}
                  className={cn(errors.name && 'border-rose-500/40')}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearError('name');
                  }}
                />
              </Field>
              <Field
                label="Email"
                htmlFor="q-email"
                required
                error={errors.email}
              >
                <TextInput
                  id="q-email"
                  aria-invalid={!!errors.email}
                  className={cn(errors.email && 'border-rose-500/40')}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearError('email');
                  }}
                />
              </Field>
            </div>

            {opening.fields.map((field) => (
              <Question
                key={field.id}
                field={field}
                value={answers[field.id]}
                file={files[field.id] ?? null}
                error={errors[field.id]}
                onChange={(value) => {
                  setAnswers((a) => ({ ...a, [field.id]: value }));
                  clearError(field.id);
                }}
                onFile={(file) => {
                  setFiles((f) => ({ ...f, [field.id]: file }));
                  clearError(field.id);
                }}
              />
            ))}

            {/* Left empty by people; see the apply API. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="absolute left-[-9999px] size-px opacity-0"
            />

            {formError && (
              <p className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                <Icon name="error" className="text-[18px]" />
                {formError}
              </p>
            )}

            <AdminButton
              type="submit"
              tone="primary"
              loading={submitting}
              className="self-start"
              iconRight="arrow_forward"
            >
              Submit application
            </AdminButton>
          </form>
        )}

        <footer className="flex items-center gap-2 text-xs text-neutral-600">
          <img
            src="/brand/portal-logo.svg"
            alt=""
            className="size-4 opacity-60"
          />
          Applications are handled in The Moon Devs portal.
        </footer>
      </div>
    </div>
  );
};
