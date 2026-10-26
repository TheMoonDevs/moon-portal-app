'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  EMAIL_VARIABLES,
  emailVariables,
  hasBracketNotes,
  MAX_BODY,
  MAX_SUBJECT,
  MAX_TEMPLATE_NAME,
  renderEmail,
  STARTER_PREFIX,
  STARTER_TEMPLATES,
  unknownPlaceholders,
} from '@/lib/hiring/emailTemplates';
import { APPLICATION_STAGES } from '@/lib/hiring/forms';
import { cn } from '@/lib/utils';
import type { APPLICATION_STAGE, HiringEmailTemplate } from '@/models/hiring';
import { useUser } from '@/utils/hooks/useUser';
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
import { type ApplicationRow, STAGE_META } from './hiringMeta';

const BLANK = 'blank';
const SHOWN_RECIPIENTS = 8;

interface SendingSettings {
  configured: boolean;
  from: string | null;
  tracksDelivery: boolean;
  /** The sender's booking link, for {{meetingLink}}. */
  meetingLink?: string | null;
}

export interface SendResult {
  sent: number;
  failed: number;
  failures: Array<{ applicationId: string; name: string; error: string }>;
  applications: ApplicationRow[];
}

const newSendId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

const Warning = ({
  tone = 'warning',
  children,
}: {
  tone?: 'warning' | 'danger';
  children: React.ReactNode;
}) => (
  <p
    className={cn(
      'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs',
      tone === 'danger'
        ? 'border-rose-500/20 bg-rose-500/10 text-rose-200'
        : 'border-amber-500/20 bg-amber-500/10 text-amber-200',
    )}
  >
    <Icon name="warning" className="mt-px text-[15px]" />
    <span>{children}</span>
  </p>
);

/** Writes one email and sends it to every recipient, filled in for each. */
export const EmailComposer = ({
  open,
  onOpenChange,
  companyId,
  companyName,
  role,
  recipients: initialRecipients,
  canEditTemplates,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
  /** The opening's title, for {{role}}. */
  role: string;
  recipients: ApplicationRow[];
  canEditTemplates: boolean;
  onSent: (result: SendResult) => void;
}) => {
  const { user } = useUser();
  const [recipients, setRecipients] = useState<ApplicationRow[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [templates, setTemplates] = useState<HiringEmailTemplate[]>([]);
  const [settings, setSettings] = useState<SendingSettings | null>(null);

  const [choice, setChoice] = useState(BLANK);
  const [base, setBase] = useState({ subject: '', body: '' });
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [moveTo, setMoveTo] = useState<APPLICATION_STAGE | ''>('');
  const [replyTo, setReplyTo] = useState('');

  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendId, setSendId] = useState(newSendId);
  const [result, setResult] = useState<SendResult | null>(null);

  const [naming, setNaming] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastFocus = useRef<'subject' | 'body'>('body');

  // A fresh message every time the composer opens.
  useEffect(() => {
    if (!open) return;
    setRecipients(initialRecipients);
    setShowAll(false);
    setChoice(BLANK);
    setBase({ subject: '', body: '' });
    setSubject('');
    setBody('');
    setMoveTo('');
    setReplyTo('');
    setMode('write');
    setPreviewId(initialRecipients[0]?.id ?? null);
    setConfirming(false);
    setResult(null);
    setNaming(null);
    setDeleteArmed(false);
    setSendId(newSendId());
    // Only when it opens; later changes to the board don't reset the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    PortalSdk.getData(
      `/api/hiring/email-templates?companyId=${companyId}`,
      null,
    )
      .then((res) => {
        setTemplates(res?.data?.templates ?? []);
        setSettings(res?.data?.sending ?? null);
      })
      .catch((err) => toast.error(errorText(err, 'Could not load templates.')));
  }, [open, companyId]);

  /* -------------------------------- templates ------------------------------- */

  const saved = templates.find((t) => t.id === choice) ?? null;
  const dirty = subject !== base.subject || body !== base.body;

  const applyTemplate = (
    id: string,
    template: {
      subject: string;
      body: string;
      moveTo?: APPLICATION_STAGE | null;
    },
  ) => {
    if (
      dirty &&
      (subject.trim() || body.trim()) &&
      !window.confirm('Replace what you wrote with this template?')
    )
      return;
    setChoice(id);
    setBase({ subject: template.subject, body: template.body });
    setSubject(template.subject);
    setBody(template.body);
    setMoveTo(template.moveTo ?? '');
    setNaming(null);
    setDeleteArmed(false);
  };

  const saveTemplate = async () => {
    setSavingTemplate(true);
    try {
      const fields = { subject, body, moveTo: moveTo || null };
      if (saved && naming === null) {
        const res = await PortalSdk.patchData(
          `/api/hiring/email-templates/${saved.id}`,
          fields,
        );
        const updated: HiringEmailTemplate = res.data.template;
        setTemplates((rows) =>
          rows.map((t) => (t.id === updated.id ? updated : t)),
        );
        toast.success('Template updated');
      } else {
        const res = await PortalSdk.postData('/api/hiring/email-templates', {
          companyId,
          name: naming,
          ...fields,
        });
        const created: HiringEmailTemplate = res.data.template;
        setTemplates((rows) =>
          [...rows, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setChoice(created.id);
        setNaming(null);
        toast.success('Template saved');
      }
      setBase({ subject, body });
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSavingTemplate(false);
    }
  };

  const deleteTemplate = async () => {
    if (!saved) return;
    setSavingTemplate(true);
    try {
      await PortalSdk.deleteData(`/api/hiring/email-templates/${saved.id}`, {});
      setTemplates((rows) => rows.filter((t) => t.id !== saved.id));
      setChoice(BLANK);
      setBase({ subject: '', body: '' });
      toast.success('Template deleted');
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSavingTemplate(false);
      setDeleteArmed(false);
    }
  };

  const insertVariable = (key: string) => {
    const token = `{{${key}}}`;
    const target =
      lastFocus.current === 'subject' ? subjectRef.current : bodyRef.current;
    const value = lastFocus.current === 'subject' ? subject : body;
    const set = lastFocus.current === 'subject' ? setSubject : setBody;
    const start = target?.selectionStart ?? value.length;
    const end = target?.selectionEnd ?? value.length;
    set(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      target?.focus();
      target?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  /* --------------------------------- preview -------------------------------- */

  const previewFor =
    recipients.find((r) => r.id === previewId) ?? recipients[0] ?? null;
  const preview = useMemo(
    () =>
      previewFor
        ? renderEmail(
            { subject, body },
            emailVariables({
              name: previewFor.name,
              role,
              company: companyName,
              sender: user?.name ?? '',
              email: previewFor.email,
              meetingLink: settings?.meetingLink,
            }),
          )
        : null,
    [
      previewFor,
      subject,
      body,
      role,
      companyName,
      user?.name,
      settings?.meetingLink,
    ],
  );
  const fromLine = settings?.from
    ? companyName
      ? `${companyName} <${settings.from}>`
      : settings.from
    : 'Not set up yet';

  /* -------------------------------- warnings -------------------------------- */

  const unknown = unknownPlaceholders(subject, body);
  const alreadySent =
    choice === BLANK
      ? 0
      : recipients.filter((r) =>
          r.history?.some((e) => e.type === 'EMAIL' && e.templateId === choice),
        ).length;
  const canSend =
    !!settings?.configured &&
    recipients.length > 0 &&
    !!subject.trim() &&
    !!body.trim();

  /* ---------------------------------- send ---------------------------------- */

  const send = async () => {
    setSending(true);
    try {
      const res = await PortalSdk.postData('/api/hiring/emails', {
        ids: recipients.map((r) => r.id),
        subject,
        body,
        sendId,
        templateId: choice === BLANK ? null : choice,
        moveTo: moveTo || null,
        replyTo: replyTo.trim() || null,
      });
      const data: SendResult = res.data;
      onSent(data);
      setConfirming(false);
      if (!data.failed) {
        toast.success(
          data.sent === 1 ? 'Email sent' : `Sent ${data.sent} emails`,
        );
        onOpenChange(false);
      } else {
        setResult(data);
      }
    } catch (err) {
      toast.error(errorText(err, 'Could not send the emails.'));
      setConfirming(false);
    } finally {
      setSending(false);
    }
  };

  const retryFailed = () => {
    if (!result) return;
    const failedIds = new Set(result.failures.map((f) => f.applicationId));
    setRecipients((rows) => rows.filter((r) => failedIds.has(r.id)));
    setPreviewId(null);
    setResult(null);
    setSendId(newSendId());
  };

  /* --------------------------------- render --------------------------------- */

  const shown = showAll ? recipients : recipients.slice(0, SHOWN_RECIPIENTS);
  const people = (n: number) => (n === 1 ? '1 person' : `${n} people`);

  const footer = result ? (
    <>
      {result.failures.length > 0 && (
        <AdminButton
          tone="secondary"
          size="sm"
          icon="refresh"
          onClick={retryFailed}
        >
          Try the failed ones again
        </AdminButton>
      )}
      <AdminButton tone="primary" size="sm" onClick={() => onOpenChange(false)}>
        Done
      </AdminButton>
    </>
  ) : confirming ? (
    <>
      <span className="mr-auto text-sm text-neutral-300">
        Send to {people(recipients.length)} now? Emails can’t be unsent.
      </span>
      <AdminButton
        tone="ghost"
        size="sm"
        disabled={sending}
        onClick={() => setConfirming(false)}
      >
        Back
      </AdminButton>
      <AdminButton
        tone="primary"
        size="sm"
        icon="send"
        loading={sending}
        onClick={send}
      >
        Send now
      </AdminButton>
    </>
  ) : (
    <>
      {canEditTemplates && (
        <div className="mr-auto flex items-center gap-2">
          {naming !== null ? (
            <>
              <TextInput
                autoFocus
                value={naming}
                maxLength={MAX_TEMPLATE_NAME}
                onChange={(e) => setNaming(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && naming.trim()) saveTemplate();
                  if (e.key === 'Escape') setNaming(null);
                }}
                placeholder="Template name"
                className="h-8 w-44 text-xs"
              />
              <AdminButton
                size="sm"
                disabled={!naming.trim()}
                loading={savingTemplate}
                onClick={saveTemplate}
              >
                Save
              </AdminButton>
              <IconAction
                icon="close"
                label="Cancel"
                onClick={() => setNaming(null)}
              />
            </>
          ) : deleteArmed && saved ? (
            <>
              <AdminButton
                tone="danger"
                size="sm"
                icon="delete"
                loading={savingTemplate}
                onClick={deleteTemplate}
              >
                Delete “{saved.name}”
              </AdminButton>
              <AdminButton
                tone="ghost"
                size="sm"
                onClick={() => setDeleteArmed(false)}
              >
                Keep
              </AdminButton>
            </>
          ) : (
            <>
              {saved && dirty && (
                <AdminButton
                  size="sm"
                  icon="save"
                  loading={savingTemplate}
                  onClick={saveTemplate}
                >
                  Update template
                </AdminButton>
              )}
              <AdminButton
                size="sm"
                tone="ghost"
                icon="bookmark_add"
                disabled={!subject.trim() || !body.trim()}
                onClick={() => setNaming(saved ? `${saved.name} copy` : '')}
              >
                Save as template
              </AdminButton>
              {saved && (
                <IconAction
                  icon="delete"
                  label="Delete template"
                  tone="danger"
                  onClick={() => setDeleteArmed(true)}
                />
              )}
            </>
          )}
        </div>
      )}
      <AdminButton tone="ghost" size="sm" onClick={() => onOpenChange(false)}>
        Cancel
      </AdminButton>
      <AdminButton
        tone="primary"
        size="sm"
        icon="send"
        disabled={!canSend}
        onClick={() => setConfirming(true)}
      >
        {recipients.length === 1 ? 'Send' : `Send to ${recipients.length}`}
      </AdminButton>
    </>
  );

  return (
    <AdminModal
      open={open}
      onOpenChange={(next) => !sending && onOpenChange(next)}
      size="lg"
      icon="mail"
      title={
        recipients.length === 1
          ? `Email ${recipients[0].name}`
          : `Email ${recipients.length} applicants`
      }
      description="Each person gets their own copy with the placeholders filled in."
      footer={footer}
    >
      {result ? (
        <div className="flex flex-col gap-4">
          <p className="flex items-center gap-2 text-sm text-neutral-200">
            <Icon
              name="check_circle"
              className="text-[18px] text-emerald-400"
            />
            Sent to {people(result.sent)}.
          </p>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-rose-300">
              {result.failed === 1
                ? '1 email was not sent:'
                : `${result.failed} emails were not sent:`}
            </p>
            <ul className="flex flex-col divide-y divide-white/[0.05] rounded-xl border border-white/[0.07]">
              {result.failures.map((f) => (
                <li key={f.applicationId} className="px-3 py-2 text-sm">
                  <span className="text-neutral-100">{f.name}</span>
                  <span className="block text-xs text-neutral-500">
                    {f.error}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <Field label="To">
            <div className="flex flex-wrap items-center gap-1.5">
              {shown.map((r) => (
                <span
                  key={r.id}
                  title={r.email}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] py-0.5 pl-2.5 pr-1 text-xs text-neutral-200"
                >
                  {r.name}
                  {recipients.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Remove ${r.name}`}
                      onClick={() =>
                        setRecipients((rows) =>
                          rows.filter((x) => x.id !== r.id),
                        )
                      }
                      className="flex size-4 items-center justify-center rounded-full text-neutral-500 hover:bg-white/10 hover:text-white"
                    >
                      <Icon name="close" className="text-[12px]" />
                    </button>
                  )}
                </span>
              ))}
              {recipients.length > SHOWN_RECIPIENTS && (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="text-xs text-neutral-400 hover:text-white"
                >
                  {showAll
                    ? 'Show fewer'
                    : `and ${recipients.length - SHOWN_RECIPIENTS} more`}
                </button>
              )}
            </div>
          </Field>

          <Field label="Template">
            <div className="flex flex-wrap gap-1.5">
              {STARTER_TEMPLATES.map((t) => {
                const id = `${STARTER_PREFIX}${t.key}`;
                return (
                  <AdminButton
                    key={id}
                    size="sm"
                    icon={t.icon}
                    tone={choice === id ? 'primary' : 'secondary'}
                    onClick={() => applyTemplate(id, t)}
                  >
                    {t.name}
                  </AdminButton>
                );
              })}
              {templates.map((t) => (
                <AdminButton
                  key={t.id}
                  size="sm"
                  icon="bookmark"
                  tone={choice === t.id ? 'primary' : 'secondary'}
                  onClick={() => applyTemplate(t.id, t)}
                >
                  {t.name}
                </AdminButton>
              ))}
              <AdminButton
                size="sm"
                icon="edit_note"
                tone={choice === BLANK ? 'primary' : 'ghost'}
                onClick={() =>
                  applyTemplate(BLANK, { subject: '', body: '', moveTo: null })
                }
              >
                Write my own
              </AdminButton>
            </div>
          </Field>

          <div className="flex items-center justify-between gap-3">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: 'write', label: 'Write', icon: 'edit' },
                { value: 'preview', label: 'Preview', icon: 'visibility' },
              ]}
            />
            {mode === 'write' ? (
              <div className="flex flex-wrap justify-end gap-1">
                {EMAIL_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    title={`Insert {{${v.key}}}`}
                    onClick={() => insertVariable(v.key)}
                    className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-neutral-300 hover:border-white/25 hover:text-white"
                  >
                    + {v.label}
                  </button>
                ))}
              </div>
            ) : (
              recipients.length > 1 && (
                <NativeSelect
                  aria-label="Preview for"
                  value={previewFor?.id ?? ''}
                  onChange={(e) => setPreviewId(e.target.value)}
                  className="h-8 w-52 text-xs"
                >
                  {recipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      As {r.name}
                    </option>
                  ))}
                </NativeSelect>
              )
            )}
          </div>

          {mode === 'write' ? (
            <>
              <Field label="Subject" htmlFor="email-subject">
                <TextInput
                  id="email-subject"
                  ref={subjectRef}
                  value={subject}
                  maxLength={MAX_SUBJECT}
                  onFocus={() => (lastFocus.current = 'subject')}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Your application for {{role}}"
                />
              </Field>
              <Field
                label="Message"
                htmlFor="email-body"
                hint="Plain text. Links become clickable, and {{firstName}} and the rest are filled in for each person."
              >
                <TextArea
                  id="email-body"
                  ref={bodyRef}
                  value={body}
                  maxLength={MAX_BODY}
                  onFocus={() => (lastFocus.current = 'body')}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Hi {{firstName}}, …"
                  className="min-h-[260px] font-mono text-[13px] leading-relaxed"
                />
              </Field>
            </>
          ) : (
            preview && (
              <div className="flex flex-col gap-2">
                <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-1 rounded-lg border border-white/[0.07] px-3 py-2 text-xs">
                  <dt className="text-neutral-500">From</dt>
                  <dd className="truncate text-neutral-200">{fromLine}</dd>
                  <dt className="text-neutral-500">To</dt>
                  <dd className="truncate text-neutral-200">
                    {previewFor?.email}
                  </dd>
                  <dt className="text-neutral-500">Reply-to</dt>
                  <dd className="truncate text-neutral-200">
                    {replyTo.trim() || user?.email || 'Your email'}
                  </dd>
                  <dt className="text-neutral-500">Subject</dt>
                  <dd className="text-neutral-100">
                    {preview.subject || (
                      <span className="text-neutral-600">No subject</span>
                    )}
                  </dd>
                </dl>
                <iframe
                  title="Email preview"
                  sandbox=""
                  srcDoc={preview.html}
                  className="h-[380px] w-full rounded-lg border border-white/[0.07] bg-white"
                />
              </div>
            )
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Then move them to"
              hint="Only people the email reached are moved."
            >
              <NativeSelect
                value={moveTo}
                onChange={(e) =>
                  setMoveTo(e.target.value as APPLICATION_STAGE | '')
                }
              >
                <option value="">Leave them where they are</option>
                {APPLICATION_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_META[s].label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Replies go to" hint="Defaults to your email.">
              <TextInput
                type="email"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                placeholder={user?.email ?? 'you@company.com'}
              />
            </Field>
          </div>

          {(settings && !settings.configured) ||
          unknown.length > 0 ||
          hasBracketNotes(body) ||
          alreadySent > 0 ? (
            <div className="flex flex-col gap-2">
              {settings && !settings.configured && (
                <Warning tone="danger">
                  Email isn’t set up yet. A portal admin needs to add
                  RESEND_API_KEY and RESEND_DOMAIN to the portal’s environment.
                </Warning>
              )}
              {hasBracketNotes(body) && (
                <Warning>
                  Fill in the parts in [square brackets] before sending.
                </Warning>
              )}
              {unknown.length > 0 && (
                <Warning>
                  {unknown.join(', ')}{' '}
                  {unknown.length === 1
                    ? 'isn’t a placeholder'
                    : 'aren’t placeholders'}{' '}
                  and will be sent as written.
                </Warning>
              )}
              {alreadySent > 0 && (
                <Warning>
                  {alreadySent === recipients.length && alreadySent > 1
                    ? 'All of them'
                    : people(alreadySent)}{' '}
                  already got this template.
                </Warning>
              )}
            </div>
          ) : null}
        </div>
      )}
    </AdminModal>
  );
};
