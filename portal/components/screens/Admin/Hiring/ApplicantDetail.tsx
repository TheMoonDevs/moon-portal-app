'use client';

import type { User } from '@db/client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { answerText, APPLICATION_STAGES } from '@/lib/hiring/forms';
import { linkParts, onlyLinks } from '@/lib/hiring/links';
import { taskDueAt } from '@/lib/hiring/tasks';
import { cn } from '@/lib/utils';
import {
  type APPLICATION_STAGE,
  type ApplicationFile,
  FORM_FIELD_TYPE,
  type FormField,
  type HiringEmail,
  type JobTask,
} from '@/models/hiring';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  CopyButton,
  Field,
  formatDate,
  Icon,
  Pill,
  TextArea,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import {
  type ApplicationRow,
  EMAIL_STATUS_META,
  STAGE_META,
  timeAgo,
} from './hiringMeta';

const AnswerLink = ({ href, label }: { href: string; label?: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="break-all text-sky-300 hover:underline"
  >
    {label ?? href}
  </a>
);

const Answer = ({
  field,
  application,
  fromTask = false,
}: {
  field: FormField;
  application: ApplicationRow;
  /** Read the answer from their task instead of their application. */
  fromTask?: boolean;
}) => {
  const value = (
    fromTask ? application.taskSubmission?.answers : application.answers
  )?.[field.id];
  if (value === undefined || value === null || value === '')
    return <span className="text-neutral-600">No answer</span>;

  if (field.type === FORM_FIELD_TYPE.FILE && typeof value === 'object') {
    const file = value as ApplicationFile;
    return (
      <a
        href={`/api/hiring/applications/${application.id}/files/${field.id}${fromTask ? '?from=task' : ''}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-neutral-200 hover:border-white/25"
      >
        <Icon name="description" className="text-[18px]" />
        {file.name}
        <Icon name="open_in_new" className="text-[14px] text-neutral-500" />
      </a>
    );
  }
  const text = answerText(value);
  // Several links may be typed in one answer, separated by spaces, commas or
  // new lines; imported answers also mix links into sentences.
  const links = onlyLinks(text);
  if (links)
    return (
      <span className="flex flex-col gap-1">
        {links.map((href) => (
          <AnswerLink key={href} href={href} />
        ))}
      </span>
    );
  return (
    <span className="whitespace-pre-wrap break-words">
      {linkParts(text).map((part, i) =>
        part.href ? (
          <AnswerLink key={i} href={part.href} label={part.text} />
        ) : (
          part.text
        ),
      )}
    </span>
  );
};

/** The task: their private link, when it's due, and what they sent. */
const TaskSection = ({
  application,
  task,
}: {
  application: ApplicationRow;
  task: JobTask;
}) => {
  const link =
    application.taskToken && typeof window !== 'undefined'
      ? `${window.location.origin}/task/${application.taskToken}`
      : null;
  const due = taskDueAt(task, application.taskSentAt);
  const sent = application.taskSubmission;
  return (
    <Field label="Task">
      <div className="flex flex-col divide-y divide-white/[0.05] rounded-xl border border-white/[0.07]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-xs text-neutral-400">
          {link ? (
            <span className="flex items-center gap-1">
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="text-sky-300 hover:underline"
              >
                Their task page
              </a>
              <CopyButton value={link} label="Copy task link" />
            </span>
          ) : (
            <span>
              No link yet. Email them with {'{{taskLink}}'} to send one.
            </span>
          )}
          {application.taskSentAt && (
            <span>Sent {formatDate(application.taskSentAt)}</span>
          )}
          {due && <span>Due {formatDate(due.toISOString())}</span>}
          {sent && (
            <Pill tone="positive" icon="task_alt">
              Submitted {timeAgo(sent.submittedAt)}
            </Pill>
          )}
        </div>
        {sent ? (
          task.fields.map((field) => (
            <div
              key={field.id}
              className="grid gap-1 px-4 py-3 text-sm text-neutral-200 sm:grid-cols-[200px_1fr] sm:gap-4"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                {field.label}
              </span>
              <Answer field={field} application={application} fromTask />
            </div>
          ))
        ) : (
          <p className="px-4 py-3 text-sm text-neutral-500">
            Nothing sent yet.
          </p>
        )}
      </div>
    </Field>
  );
};

const EmailLog = ({
  application,
  nameOf,
}: {
  application: ApplicationRow;
  nameOf: (id?: string | null) => string;
}) => {
  const [emails, setEmails] = useState<HiringEmail[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const lastEmail = application.lastEmail;

  // Reloads when a new email goes out or its delivery status changes.
  useEffect(() => {
    let cancelled = false;
    PortalSdk.getData(
      `/api/hiring/emails?applicationId=${application.id}`,
      null,
    )
      .then((res) => !cancelled && setEmails(res?.data?.emails ?? []))
      .catch(() => !cancelled && setEmails([]));
    return () => {
      cancelled = true;
    };
  }, [application.id, lastEmail?.id, lastEmail?.status]);

  if (!emails?.length) return null;

  return (
    <Field label="Emails">
      <ul className="flex flex-col divide-y divide-white/[0.05] rounded-xl border border-white/[0.07]">
        {emails.map((email) => {
          const status = EMAIL_STATUS_META[email.status];
          const expanded = openId === email.id;
          return (
            <li key={email.id}>
              <button
                type="button"
                onClick={() => setOpenId(expanded ? null : email.id)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.03]"
              >
                <Icon
                  name={expanded ? 'expand_less' : 'expand_more'}
                  className="text-[18px] text-neutral-500"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-neutral-100">
                    {email.subject}
                  </span>
                  <span className="block text-[11px] text-neutral-500">
                    {nameOf(email.sentById)} · {timeAgo(email.sentAt)}
                  </span>
                </span>
                <span title={email.error || status?.hint}>
                  <Pill tone={status?.tone} icon={status?.icon}>
                    {status?.label ?? email.status}
                  </Pill>
                </span>
              </button>
              {expanded && (
                <div className="flex flex-col gap-2 px-3 pb-3 pl-10">
                  {email.error && (
                    <p className="text-xs text-rose-300">{email.error}</p>
                  )}
                  <p className="text-[11px] text-neutral-500">
                    From {email.from} to {email.to}
                    {email.replyTo ? `, replies to ${email.replyTo}` : ''}
                  </p>
                  <p className="whitespace-pre-wrap break-words rounded-lg bg-white/[0.03] p-3 text-xs leading-relaxed text-neutral-300">
                    {email.text}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Field>
  );
};

export const ApplicantDetail = ({
  application,
  fields,
  task,
  users,
  canEdit,
  onClose,
  onUpdated,
  onEmail,
}: {
  application: ApplicationRow | null;
  fields: FormField[];
  /** The opening's task, when it has one. */
  task?: JobTask | null;
  users: User[];
  canEdit: boolean;
  onClose: () => void;
  onUpdated: (application: ApplicationRow) => void;
  /** Opens the composer for this applicant. */
  onEmail?: () => void;
}) => {
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [moving, setMoving] = useState<APPLICATION_STAGE | null>(null);

  useEffect(() => {
    setNotes(application?.notes ?? '');
  }, [application?.id, application?.notes]);

  if (!application) return null;

  const patch = async (body: Record<string, unknown>) => {
    const res = await PortalSdk.patchData(
      `/api/hiring/applications/${application.id}`,
      body,
    );
    onUpdated(res.data.application);
  };

  const move = async (stage: APPLICATION_STAGE) => {
    setMoving(stage);
    try {
      await patch({ stage });
      toast.success(`Moved to ${STAGE_META[stage].label}`);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setMoving(null);
    }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await patch({ notes });
      toast.success('Notes saved');
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSavingNotes(false);
    }
  };

  const nameOf = (id?: string | null) =>
    users.find((u) => u.id === id)?.name || 'A teammate';
  const stage = STAGE_META[application.stage];

  return (
    <AdminModal
      open={!!application}
      onOpenChange={(open) => !open && onClose()}
      size="lg"
      icon="person"
      title={application.name}
      description={`Applied ${formatDate(application.submittedAt)} · ${timeAgo(application.submittedAt)}`}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <Pill tone={stage.tone} icon={stage.icon}>
            {stage.label}
          </Pill>
          <span className="flex items-center gap-1 text-sm text-neutral-300">
            <a href={`mailto:${application.email}`} className="hover:underline">
              {application.email}
            </a>
            <CopyButton value={application.email} label="Copy email" />
          </span>
          {canEdit && onEmail && (
            <AdminButton
              size="sm"
              icon="mail"
              className="ml-auto"
              onClick={onEmail}
            >
              Email
            </AdminButton>
          )}
        </div>

        {canEdit && (
          <Field label="Move to">
            <div className="flex flex-wrap gap-2">
              {APPLICATION_STAGES.map((key) => {
                const meta = STAGE_META[key];
                const active = key === application.stage;
                return (
                  <AdminButton
                    key={key}
                    size="sm"
                    tone={active ? 'primary' : 'secondary'}
                    icon={meta.icon}
                    loading={moving === key}
                    disabled={active || !!moving}
                    onClick={() => move(key)}
                  >
                    {meta.label}
                  </AdminButton>
                );
              })}
            </div>
          </Field>
        )}

        <div className="flex flex-col divide-y divide-white/[0.05] rounded-xl border border-white/[0.07]">
          {fields.length === 0 && (
            <p className="px-4 py-3 text-sm text-neutral-500">
              This form only asked for a name and email.
            </p>
          )}
          {fields.map((field) => (
            <div
              key={field.id}
              className="grid gap-1 px-4 py-3 text-sm text-neutral-200 sm:grid-cols-[200px_1fr] sm:gap-4"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                {field.label}
              </span>
              <Answer field={field} application={application} />
            </div>
          ))}
        </div>

        {task && <TaskSection application={application} task={task} />}

        <Field label="Notes" hint="Only your hiring team sees these.">
          <TextArea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!canEdit}
            placeholder="How the call went, what to ask next…"
          />
          {canEdit && notes !== (application.notes ?? '') && (
            <AdminButton
              size="sm"
              tone="primary"
              className="mt-2 self-start"
              loading={savingNotes}
              onClick={saveNotes}
            >
              Save notes
            </AdminButton>
          )}
        </Field>

        <EmailLog application={application} nameOf={nameOf} />

        <Field label="History">
          <ol className="flex flex-col gap-2">
            {[...(application.history ?? [])].reverse().map((event, i) => (
              <li
                key={`${event.at}-${i}`}
                className="flex items-center gap-3 text-xs text-neutral-400"
              >
                <span
                  className={cn(
                    'size-2 shrink-0 rounded-full',
                    event.type === 'SUBMITTED'
                      ? 'bg-sky-400'
                      : event.type === 'EMAIL'
                        ? 'bg-violet-400'
                        : event.type === 'TASK_SUBMITTED'
                          ? 'bg-emerald-400'
                          : 'bg-white/30',
                  )}
                />
                <span className="flex-1">
                  {event.type === 'SUBMITTED'
                    ? event.byUserId
                      ? `Applied, imported by ${nameOf(event.byUserId)}${event.text ? ` from ${event.text}` : ''}`
                      : 'Applied'
                    : event.type === 'STAGE_CHANGED' && event.to
                      ? `${nameOf(event.byUserId)} moved them to ${STAGE_META[event.to]?.label ?? event.to}`
                      : event.type === 'EMAIL'
                        ? `${nameOf(event.byUserId)} emailed “${event.text}”`
                        : event.type === 'TASK_SUBMITTED'
                          ? event.text || 'Sent their task'
                          : event.text}
                </span>
                <span className="text-neutral-600">{timeAgo(event.at)}</span>
              </li>
            ))}
          </ol>
        </Field>
      </div>
    </AdminModal>
  );
};
