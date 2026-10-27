'use client';

import { Caveat, DM_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import {
  FILE_ACCEPT,
  MAX_FILE_BYTES,
  validateAnswers,
} from '@/lib/hiring/forms';
import { TASK_PAGES } from '@/lib/hiring/taskPages';
import {
  FORM_FIELD_TYPE,
  type FormField,
  type TaskDeliverable,
} from '@/models/hiring';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';

import styles from './task.module.css';
import {
  DreamScene,
  FounderScene,
  ManifestoScene,
  MarkScene,
  StudioScene,
  TeamScene,
  TimelineScene,
} from './TaskScenes';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--task-sans',
});
const mono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--task-mono',
});
const hand = Caveat({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--task-hand',
});

/** What a candidate's private task page may show. */
export interface PublicTask {
  token: string;
  /** The hiring team's preview: the form works but sends nothing. */
  preview?: boolean;
  firstName: string;
  role: string;
  company: string;
  task: {
    page: string | null;
    brief: string;
    effort: string | null;
    deliverables: TaskDeliverable[];
    closing: string | null;
    fields: FormField[];
  };
  dueAt: string | null;
  canSubmit: boolean;
  submission: null | {
    submittedAt: string;
    answers: Array<{
      id: string;
      label: string;
      text: string;
      isFile: boolean;
    }>;
  };
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const Shell = ({ children }: { children: ReactNode }) => {
  const grain = useRef<HTMLCanvasElement>(null);

  // Animated paper grain, redrawn a dozen times a second.
  useEffect(() => {
    const c = grain.current;
    const g = c?.getContext('2d');
    if (!c || !g) return;
    const img = g.createImageData(c.width, c.height);
    let raf = 0;
    let last = 0;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick = (t: number) => {
      if (t - last > 80) {
        last = t;
        for (let i = 0; i < img.data.length; i += 4) {
          const v = Math.random() * 255;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
      }
      if (!still) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={`${styles.root} ${sans.variable} ${mono.variable} ${hand.variable}`}
    >
      <canvas
        ref={grain}
        className={styles.grain}
        width={320}
        height={320}
        aria-hidden="true"
      />
      {children}
    </div>
  );
};

export const TaskLinkMissing = () => (
  <Shell>
    <main className={styles.missing}>
      <div>
        <h1>This link doesn&apos;t open anything.</h1>
        <p>
          Check that you copied the whole link from your email. If it still
          doesn&apos;t work, reply to that email and we&apos;ll send a new one.
        </p>
      </div>
    </main>
  </Shell>
);

/* ---------------------------------- form ---------------------------------- */

type Answers = Record<string, string | string[] | boolean>;

const Question = ({
  field,
  value,
  file,
  keptFile,
  error,
  onChange,
  onFile,
}: {
  field: FormField;
  value: Answers[string] | undefined;
  file: File | null;
  keptFile: string | null;
  error?: string;
  onChange: (value: Answers[string]) => void;
  onFile: (file: File | null) => void;
}) => {
  const id = `q-${field.id}`;
  const label = (
    <>
      {field.label}
      {field.required && <em> *</em>}
    </>
  );
  const help = field.helpText && (
    <span id={`${id}-help`} className={styles.help}>
      {field.helpText}
    </span>
  );
  const described = field.helpText ? `${id}-help` : undefined;
  const err = error && <span className={styles.err}>{error}</span>;

  if (
    field.type === FORM_FIELD_TYPE.SELECT ||
    field.type === FORM_FIELD_TYPE.MULTI_SELECT
  ) {
    const many = field.type === FORM_FIELD_TYPE.MULTI_SELECT;
    const list = Array.isArray(value) ? value : value ? [String(value)] : [];
    return (
      <fieldset
        className={styles.q}
        style={{ border: 0, padding: 0, margin: 0 }}
      >
        <legend>{label}</legend>
        {help}
        <div className={styles.choices}>
          {field.options?.map((option) => (
            <label key={option} className={styles.choice}>
              <input
                type={many ? 'checkbox' : 'radio'}
                name={id}
                checked={list.includes(option)}
                onChange={(e) =>
                  onChange(
                    many
                      ? e.target.checked
                        ? [...list, option]
                        : list.filter((o) => o !== option)
                      : option,
                  )
                }
              />
              {option}
            </label>
          ))}
        </div>
        {err}
      </fieldset>
    );
  }

  if (field.type === FORM_FIELD_TYPE.CHECKBOX)
    return (
      <div className={styles.q}>
        <label className={styles.choice} htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
          />
          {field.placeholder || field.label}
          {field.required && <em> *</em>}
        </label>
        {help}
        {err}
      </div>
    );

  if (field.type === FORM_FIELD_TYPE.FILE)
    return (
      <div className={styles.q}>
        <label htmlFor={id}>{label}</label>
        {help}
        <div className={styles.file}>
          <input
            id={id}
            type="file"
            accept={FILE_ACCEPT}
            aria-describedby={described}
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
          <span aria-hidden="true">↑</span>
          <span>
            {file
              ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`
              : keptFile
                ? `${keptFile} (sent last time; choose a file to replace it)`
                : 'Choose a file, or drop it here'}
          </span>
        </div>
        {err}
      </div>
    );

  const common = {
    id,
    className: styles.input,
    'aria-describedby': described,
    value: typeof value === 'string' ? value : '',
    placeholder: field.placeholder ?? undefined,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
  };
  return (
    <div className={styles.q}>
      <label htmlFor={id}>{label}</label>
      {help}
      {field.type === FORM_FIELD_TYPE.LONG_TEXT ? (
        <textarea {...common} />
      ) : (
        <input
          {...common}
          type={
            field.type === FORM_FIELD_TYPE.EMAIL
              ? 'email'
              : field.type === FORM_FIELD_TYPE.NUMBER
                ? 'number'
                : field.type === FORM_FIELD_TYPE.DATE
                  ? 'date'
                  : field.type === FORM_FIELD_TYPE.PHONE
                    ? 'tel'
                    : field.type === FORM_FIELD_TYPE.URL
                      ? 'url'
                      : 'text'
          }
        />
      )}
      {err}
    </div>
  );
};

const Received = ({
  submission,
  canSubmit,
  dueAt,
  onEdit,
}: {
  submission: NonNullable<PublicTask['submission']>;
  canSubmit: boolean;
  dueAt: string | null;
  onEdit: () => void;
}) => (
  <div className={styles.received}>
    <h2>Received, thank you.</h2>
    <p className={styles.help}>
      Sent {formatDate(submission.submittedAt)}.{' '}
      {canSubmit && dueAt
        ? `You can change it until ${formatDate(dueAt)}.`
        : 'We will be in touch by email.'}
    </p>
    <dl>
      {submission.answers.map((a) => (
        <div key={a.id}>
          <dt>{a.label}</dt>
          <dd>{a.isFile ? `File: ${a.text}` : a.text}</dd>
        </div>
      ))}
    </dl>
    {canSubmit && (
      <button
        type="button"
        className={styles.btn}
        style={{ marginTop: 18 }}
        onClick={onEdit}
      >
        Change what I sent
      </button>
    )}
  </div>
);

const TaskForm = ({
  data,
  onSent,
}: {
  data: PublicTask;
  onSent: (submission: NonNullable<PublicTask['submission']>) => void;
}) => {
  const fields = data.task.fields;
  const previous = data.submission;
  const [answers, setAnswers] = useState<Answers>(() =>
    Object.fromEntries(
      (previous?.answers ?? [])
        .filter((a) => !a.isFile)
        .map((a) => {
          const field = fields.find((f) => f.id === a.id);
          if (field?.type === FORM_FIELD_TYPE.MULTI_SELECT)
            return [a.id, a.text.split(', ')];
          if (field?.type === FORM_FIELD_TYPE.CHECKBOX)
            return [a.id, a.text === 'Yes'];
          return [a.id, a.text];
        }),
    ),
  );
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const kept = (id: string) =>
    previous?.answers.find((a) => a.id === id && a.isFile)?.text ?? null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const attached = fields
      .filter(
        (f) => f.type === FORM_FIELD_TYPE.FILE && (files[f.id] || kept(f.id)),
      )
      .map((f) => f.id);
    const local = validateAnswers(fields, answers, {
      filesPresent: attached,
    }).errors;
    for (const [id, file] of Object.entries(files))
      if (file && file.size > MAX_FILE_BYTES)
        local[id] = `Files can be up to ${MAX_FILE_BYTES / 1024 / 1024} MB.`;
    setErrors(local);
    if (Object.keys(local).length) {
      setFormError('Please fix the highlighted answers.');
      return;
    }
    if (data.preview) {
      setFormError(
        'This is a preview, so nothing was sent. Candidates send their work from here.',
      );
      return;
    }

    const body = new FormData();
    body.set('payload', JSON.stringify({ answers }));
    for (const [id, file] of Object.entries(files))
      if (file) body.set(`file:${id}`, file);

    setSending(true);
    try {
      const res = await fetch(`/api/hiring/task/${data.token}`, {
        method: 'POST',
        headers: { tmd_portal_api_key: TMD_PORTAL_API_KEY },
        body,
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok) {
        onSent({
          submittedAt: result?.data?.submittedAt ?? new Date().toISOString(),
          answers: fields
            .filter((f) =>
              f.type === FORM_FIELD_TYPE.FILE
                ? files[f.id] || kept(f.id)
                : answers[f.id] !== undefined && answers[f.id] !== '',
            )
            .map((f) => {
              const v = answers[f.id];
              return {
                id: f.id,
                label: f.label,
                isFile: f.type === FORM_FIELD_TYPE.FILE,
                text:
                  f.type === FORM_FIELD_TYPE.FILE
                    ? (files[f.id]?.name ?? kept(f.id) ?? '')
                    : Array.isArray(v)
                      ? v.join(', ')
                      : typeof v === 'boolean'
                        ? v
                          ? 'Yes'
                          : 'No'
                        : String(v),
              };
            }),
        });
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
      setSending(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <h2 className={styles.formHead}>Send your work.</h2>
      {fields.map((field) => (
        <Question
          key={field.id}
          field={field}
          value={answers[field.id]}
          file={files[field.id] ?? null}
          keptFile={kept(field.id)}
          error={errors[field.id]}
          onChange={(value) => setAnswers((a) => ({ ...a, [field.id]: value }))}
          onFile={(file) => setFiles((f) => ({ ...f, [field.id]: file }))}
        />
      ))}
      {formError && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}
      <button type="submit" className={styles.btn} disabled={sending}>
        {sending ? 'Sending…' : previous ? 'Send again →' : 'Send it →'}
      </button>
    </form>
  );
};

const BriefScene = ({ data }: { data: PublicTask }) => {
  const [submission, setSubmission] = useState(data.submission);
  const [editing, setEditing] = useState(!data.submission && data.canSubmit);
  // Matches canSubmitTask: send once, or again until the due date.
  const canSubmit = !submission
    ? data.canSubmit
    : !!data.dueAt && new Date() < new Date(data.dueAt);
  const { task } = data;

  return (
    <section className={styles.brief} id="brief">
      <div className={styles.briefIn}>
        <h2 className={styles.ready}>
          Ready<span>?</span>
        </h2>
        {task.brief
          .split(/\n\s*\n/)
          .filter(Boolean)
          .map((para, i) => (
            <p key={i} className={styles.premise}>
              {para}
            </p>
          ))}
        <div className={styles.meta}>
          {task.effort && (
            <span>
              Time <b>{task.effort}</b>
            </span>
          )}
          {data.dueAt && (
            <span>
              Due <b>{formatDate(data.dueAt)}</b>
            </span>
          )}
        </div>
        {task.deliverables.length > 0 && (
          <ol className={styles.dl}>
            {task.deliverables.map((d, i) => (
              <li key={i}>
                <span className={styles.n}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  {d.title && <h3>{d.title}</h3>}
                  {d.body && <p>{d.body}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
        {task.closing && <p className={styles.extra}>{task.closing}</p>}

        {submission && !editing ? (
          <Received
            submission={submission}
            canSubmit={canSubmit}
            dueAt={data.dueAt}
            onEdit={() => setEditing(true)}
          />
        ) : canSubmit ? (
          <TaskForm
            data={{ ...data, submission }}
            onSent={(sent) => {
              setSubmission(sent);
              setEditing(false);
              document
                .getElementById('brief')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        ) : null}
        <p className={styles.foot}>
          {data.role} · {data.company}
        </p>
      </div>
    </section>
  );
};

/* ---------------------------------- page ---------------------------------- */

export const TaskPage = ({ data }: { data: PublicTask }) => {
  const intro = data.task.page ? TASK_PAGES[data.task.page] : null;
  return (
    <Shell>
      <header className={styles.top}>
        <span>{data.company.toLowerCase()}</span>
        <span>
          {data.preview && 'preview · '}
          {data.role.toLowerCase()}
        </span>
      </header>
      {intro ? (
        <main>
          <DreamScene firstName={data.firstName} />
          <ManifestoScene />
          <StudioScene studio={intro.studio} />
          <MarkScene mark={intro.mark} firstName={data.firstName} />
          <TeamScene team={intro.team} firstName={data.firstName} />
          <FounderScene founder={intro.founder} />
          <TimelineScene timeline={intro.timeline} promises={intro.promises} />
          <BriefScene data={data} />
        </main>
      ) : (
        <main>
          <section className={styles.brief} style={{ paddingTop: '20vh' }}>
            <div className={styles.briefIn}>
              <p className={styles.hello}>{data.firstName}, this is for you.</p>
            </div>
          </section>
          <BriefScene data={data} />
        </main>
      )}
    </Shell>
  );
};
