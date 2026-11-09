'use client';

import type { User } from '@db/client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { QUICK_ACTION_TEMPLATES } from '@/lib/hiring/emailTemplates';
import { answerText, APPLICATION_STAGES } from '@/lib/hiring/forms';
import { linkParts, onlyLinks } from '@/lib/hiring/links';
import { MANUAL_POOL_TAGS } from '@/lib/hiring/pool';
import { sourceLabel } from '@/lib/hiring/sources';
import { applicationDueAt } from '@/lib/hiring/tasks';
import { cn } from '@/lib/utils';
import {
  APPLICATION_STAGE,
  type ApplicationFile,
  type ApplicationTag,
  FORM_FIELD_TYPE,
  type FormField,
  type HiringEmail,
  type JobTask,
} from '@/models/hiring';
import { useUser } from '@/utils/hooks/useUser';
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
  TextInput,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import {
  type ApplicationRow,
  EMAIL_STATUS_META,
  STAGE_META,
  timeAgo,
} from './hiringMeta';
import { ScorecardForm, ScorecardList } from './Scorecards';

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

const DAY_MS = 86400000;
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/** Picks a new due date for one candidate's task. */
const ExtendTask = ({
  application,
  due,
  onUpdated,
  onDone,
}: {
  application: ApplicationRow;
  due: Date | null;
  onUpdated: (application: ApplicationRow) => void;
  onDone: () => void;
}) => {
  const now = new Date();
  const from = due && due > now ? due : now;
  const [day, setDay] = useState(isoDay(new Date(from.getTime() + 3 * DAY_MS)));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await PortalSdk.patchData(
        `/api/hiring/applications/${application.id}`,
        { extendTask: { dueAt: day } },
      );
      onUpdated(res.data.application);
      toast.success(`${application.name.split(/\s+/)[0]} now has until ${day}`);
      onDone();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-xs text-neutral-400">
      <span>New due date</span>
      <TextInput
        type="date"
        value={day}
        min={isoDay(new Date(now.getTime() + DAY_MS))}
        onChange={(e) => setDay(e.target.value)}
        className="h-8 w-40 text-xs"
      />
      {[2, 7].map((days) => (
        <button
          key={days}
          type="button"
          onClick={() =>
            setDay(isoDay(new Date(from.getTime() + days * DAY_MS)))
          }
          className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-neutral-300 hover:border-white/25 hover:text-white"
        >
          +{days === 7 ? '1 week' : `${days} days`}
        </button>
      ))}
      <span className="ml-auto flex gap-1">
        <AdminButton size="sm" tone="ghost" onClick={onDone}>
          Cancel
        </AdminButton>
        <AdminButton
          size="sm"
          tone="primary"
          loading={saving}
          disabled={!day}
          onClick={save}
        >
          Extend
        </AdminButton>
      </span>
      <p className="w-full text-[11px] text-neutral-500">
        Only {application.name.split(/\s+/)[0]} gets the new date. They can send
        their task, or send it again, until the end of that day (UTC). Nobody is
        emailed; send a reminder to tell them.
      </p>
    </div>
  );
};

/** The task: their private link, when it's due, and what they sent. */
const TaskSection = ({
  application,
  task,
  canEdit,
  onUpdated,
  onRemind,
}: {
  application: ApplicationRow;
  task: JobTask;
  canEdit: boolean;
  onUpdated: (application: ApplicationRow) => void;
  /** Opens the composer with the task reminder. */
  onRemind?: () => void;
}) => {
  const [extending, setExtending] = useState(false);
  const link =
    application.taskToken && typeof window !== 'undefined'
      ? `${window.location.origin}/task/${application.taskToken}`
      : null;
  const due = applicationDueAt(task, application);
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
          {due && (
            <span
              className={cn(
                due < new Date() && !sent
                  ? 'text-rose-300'
                  : application.taskDueOverride && 'text-amber-200',
              )}
              title={
                application.taskDueOverride
                  ? 'Extended for this candidate'
                  : undefined
              }
            >
              Due {formatDate(due.toISOString())}
              {application.taskDueOverride ? ' (extended)' : ''}
            </span>
          )}
          {link && !sent && (
            <span
              className={cn(
                'flex items-center gap-1',
                application.taskOpens?.count
                  ? 'text-violet-300'
                  : 'text-neutral-500',
              )}
              title={
                application.taskOpens
                  ? `First opened ${formatDate(application.taskOpens.firstAt)}`
                  : 'Counted when they open their task page'
              }
            >
              <Icon
                name={
                  application.taskOpens?.count ? 'visibility' : 'visibility_off'
                }
                className="text-[14px]"
              />
              {application.taskOpens?.count
                ? `Opened ${application.taskOpens.count === 1 ? 'once' : `${application.taskOpens.count} times`}, last ${timeAgo(application.taskOpens.lastAt)}`
                : 'Not opened yet'}
            </span>
          )}
          {sent && (
            <Pill tone="positive" icon="task_alt">
              Submitted {timeAgo(sent.submittedAt)}
            </Pill>
          )}
          {canEdit && link && !extending && (
            <span className="ml-auto flex gap-1">
              <AdminButton
                size="sm"
                tone="ghost"
                icon="more_time"
                onClick={() => setExtending(true)}
              >
                Give more time
              </AdminButton>
              {onRemind && (
                <AdminButton
                  size="sm"
                  tone="ghost"
                  icon="alarm"
                  onClick={onRemind}
                >
                  Remind
                </AdminButton>
              )}
            </span>
          )}
        </div>
        {extending && (
          <ExtendTask
            application={application}
            due={due}
            onUpdated={onUpdated}
            onDone={() => setExtending(false)}
          />
        )}
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

const newSendId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

const EmailLog = ({
  application,
  nameOf,
  canEdit,
  onUpdated,
}: {
  application: ApplicationRow;
  nameOf: (id?: string | null) => string;
  canEdit: boolean;
  onUpdated: (application: ApplicationRow) => void;
}) => {
  const [emails, setEmails] = useState<HiringEmail[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  // Two clicks to send again; the id makes a retried request send once.
  const [armed, setArmed] = useState<{ id: string; sendId: string } | null>(
    null,
  );
  const [resending, setResending] = useState(false);
  const lastEmail = application.lastEmail;

  const resend = async (email: HiringEmail) => {
    if (!armed || armed.id !== email.id) return;
    setResending(true);
    try {
      const res = await PortalSdk.postData('/api/hiring/emails/resend', {
        emailId: email.id,
        sendId: armed.sendId,
      });
      onUpdated(res.data.application);
      toast.success('Sent again');
      setArmed(null);
    } catch (err) {
      toast.error(errorText(err, 'Could not send it again.'));
    } finally {
      setResending(false);
    }
  };

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
                  {canEdit &&
                    (armed?.id === email.id ? (
                      <span className="flex items-center gap-2 self-start">
                        <span className="text-xs text-neutral-300">
                          Send this to {application.email} again?
                        </span>
                        <AdminButton
                          size="sm"
                          tone="ghost"
                          disabled={resending}
                          onClick={() => setArmed(null)}
                        >
                          No
                        </AdminButton>
                        <AdminButton
                          size="sm"
                          tone="primary"
                          icon="send"
                          loading={resending}
                          onClick={() => resend(email)}
                        >
                          Send again
                        </AdminButton>
                      </span>
                    ) : (
                      <AdminButton
                        size="sm"
                        tone="ghost"
                        icon="forward_to_inbox"
                        className="self-start"
                        onClick={() =>
                          setArmed({ id: email.id, sendId: newSendId() })
                        }
                      >
                        Send again
                      </AdminButton>
                    ))}
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
  screening,
  users,
  canEdit,
  onClose,
  onUpdated,
  onEmail,
  onRemind,
  onCompose,
}: {
  application: ApplicationRow | null;
  fields: FormField[];
  /** The opening's task, when it has one. */
  task?: JobTask | null;
  /** The opening's screening requirements, rated on scorecards. */
  screening?: string | null;
  users: User[];
  canEdit: boolean;
  onClose: () => void;
  onUpdated: (application: ApplicationRow) => void;
  /** Opens the composer for this applicant. */
  onEmail?: () => void;
  /** Opens the composer with the task reminder for this applicant. */
  onRemind?: () => void;
  /** Opens the composer for this applicant with a template picked. */
  onCompose?: (templateId: string) => void;
}) => {
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [moving, setMoving] = useState<APPLICATION_STAGE | null>(null);
  const [tagging, setTagging] = useState<ApplicationTag | null>(null);
  const [scoring, setScoring] = useState(false);
  const [extending, setExtending] = useState(false);
  const { user: me } = useUser();

  useEffect(() => {
    setNotes(application?.notes ?? '');
  }, [application?.id, application?.notes]);

  useEffect(() => {
    setScoring(false);
    setExtending(false);
  }, [application?.id]);

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

  const toggleTag = async (tag: ApplicationTag) => {
    const current = application.tags ?? [];
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    setTagging(tag);
    try {
      await patch({ tags: next });
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setTagging(null);
    }
  };

  /** Quick action: 3 more days, then the email that tells them. */
  const extendAndNotify = async () => {
    setExtending(true);
    try {
      await patch({ extendTask: { days: 3 } });
      toast.success(
        `${application.name.split(/\s+/)[0]} has 3 more days. Check the email and send it.`,
      );
      onCompose?.(QUICK_ACTION_TEMPLATES.deadlineExtended);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setExtending(false);
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
          {application.source && (
            <span
              className="text-xs text-neutral-500"
              title="Where they came from"
            >
              via {sourceLabel(application.source)}
            </span>
          )}
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

        {canEdit && onCompose && (
          <Field
            label="Quick actions"
            hint="Each one opens its email for you to check before it’s sent. The rejections move them to Rejected, and Send task moves them to Task."
          >
            <div className="flex flex-wrap gap-2">
              <AdminButton
                size="sm"
                icon="person_off"
                onClick={() => onCompose(QUICK_ACTION_TEMPLATES.rejectNotFit)}
              >
                Reject (Not fit)
              </AdminButton>
              <AdminButton
                size="sm"
                icon="assignment_late"
                disabled={!application.taskSentAt}
                title={
                  application.taskSentAt
                    ? undefined
                    : 'They haven’t been sent a task yet.'
                }
                onClick={() => onCompose(QUICK_ACTION_TEMPLATES.rejectNoTask)}
              >
                Reject (Task not submitted)
              </AdminButton>
              <AdminButton
                size="sm"
                icon="forum"
                onClick={() =>
                  onCompose(QUICK_ACTION_TEMPLATES.rejectAfterInterview)
                }
              >
                Reject (Post interview)
              </AdminButton>
              <AdminButton
                size="sm"
                icon="assignment"
                disabled={!task}
                title={task ? undefined : 'Add a task to this opening first.'}
                onClick={() => onCompose(QUICK_ACTION_TEMPLATES.sendTask)}
              >
                Send task
              </AdminButton>
              <AdminButton
                size="sm"
                icon="more_time"
                loading={extending}
                disabled={!task || !application.taskSentAt}
                title={
                  task && application.taskSentAt
                    ? 'Adds 3 days to their due date, then opens the email that tells them.'
                    : 'They haven’t been sent a task yet.'
                }
                onClick={extendAndNotify}
              >
                Extend deadline
              </AdminButton>
            </div>
          </Field>
        )}

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

        {application.stage === APPLICATION_STAGE.HIRED && (
          <a
            href={
              application.onboardingId
                ? `/hiring?view=onboarding&company=${application.companyId}&hire=${application.onboardingId}`
                : `/hiring?view=onboarding&company=${application.companyId}&start=${application.id}`
            }
            className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 transition-colors hover:border-emerald-400/40"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
              <Icon name="how_to_reg" className="text-[20px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-white">
                {application.onboardingId ? 'Onboarding' : 'Start onboarding'}
              </span>
              <span className="block text-xs text-neutral-400">
                {application.onboardingId
                  ? 'Their details, agreements and trial are under Onboarding in the Hiring space.'
                  : 'Send them the details form to set up their portal account.'}
              </span>
            </span>
            <Icon
              name="arrow_forward"
              className="text-[18px] text-neutral-400"
            />
          </a>
        )}

        <Field
          label="Talent pool"
          hint="Tagged people stay in the talent pool after this opening, to ask about future ones."
        >
          <div className="flex flex-wrap gap-2">
            {MANUAL_POOL_TAGS.map((t) => {
              const on = (application.tags ?? []).includes(t.value);
              return (
                <AdminButton
                  key={t.value}
                  size="sm"
                  tone={on ? 'primary' : 'secondary'}
                  icon={t.icon}
                  title={t.hint}
                  disabled={!canEdit || (!!tagging && tagging !== t.value)}
                  loading={tagging === t.value}
                  onClick={() => toggleTag(t.value)}
                >
                  {t.label}
                </AdminButton>
              );
            })}
          </div>
        </Field>

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

        {task && (
          <TaskSection
            application={application}
            task={task}
            canEdit={canEdit}
            onUpdated={onUpdated}
            onRemind={canEdit ? onRemind : undefined}
          />
        )}

        {(application.stage === APPLICATION_STAGE.INTERVIEW ||
          (application.scorecards ?? []).length > 0) && (
          <Field label="Scorecards">
            <div className="flex flex-col gap-3">
              <ScorecardList
                scorecards={application.scorecards ?? []}
                users={users}
              />
              {scoring ? (
                <div className="rounded-xl border border-white/[0.07] p-4">
                  <ScorecardForm
                    application={application}
                    screening={screening}
                    onCancel={() => setScoring(false)}
                    onSaved={(updated) => {
                      onUpdated(updated);
                      setScoring(false);
                    }}
                  />
                </div>
              ) : (
                <AdminButton
                  size="sm"
                  icon="rate_review"
                  className="self-start"
                  onClick={() => setScoring(true)}
                >
                  {(application.scorecards ?? []).some(
                    (c) => c.byUserId === me?.id && !c.bookingId,
                  )
                    ? 'Edit my scorecard'
                    : 'Add a scorecard'}
                </AdminButton>
              )}
            </div>
          </Field>
        )}

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

        <EmailLog
          application={application}
          nameOf={nameOf}
          canEdit={canEdit}
          onUpdated={onUpdated}
        />

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
                          : event.type === 'TASK_EXTENDED'
                            ? 'bg-amber-400'
                            : event.type === 'SCORECARD'
                              ? 'bg-violet-300'
                              : event.type === 'ONBOARDED'
                                ? 'bg-emerald-300'
                                : event.type === 'TASK_OPENED'
                                  ? 'bg-violet-400'
                                  : 'bg-white/30',
                  )}
                />
                <span className="flex-1">
                  {event.type === 'SUBMITTED'
                    ? event.byUserId
                      ? `Applied, imported by ${nameOf(event.byUserId)}${event.text ? ` from ${event.text}` : ''}`
                      : 'Applied'
                    : event.type === 'STAGE_CHANGED' && event.to
                      ? `${event.byUserId ? `${nameOf(event.byUserId)} moved them` : 'Moved'} to ${STAGE_META[event.to]?.label ?? event.to}`
                      : event.type === 'EMAIL'
                        ? `${nameOf(event.byUserId)} emailed “${event.text}”`
                        : event.type === 'TASK_OPENED'
                          ? 'Opened their task link'
                          : event.type === 'TASK_SUBMITTED'
                            ? event.text || 'Sent their task'
                            : event.type === 'TASK_EXTENDED'
                              ? `${nameOf(event.byUserId)}: ${event.text}`
                              : event.type === 'SCORECARD' ||
                                  event.type === 'ONBOARDED'
                                ? `${nameOf(event.byUserId)} ${(event.text ?? '').replace(/^./, (c) => c.toLowerCase())}`
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
