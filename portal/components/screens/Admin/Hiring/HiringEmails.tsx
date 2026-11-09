'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  EMAIL_VARIABLES,
  MAX_BODY,
  MAX_SUBJECT,
  MAX_TEMPLATE_NAME,
  STARTER_TEMPLATES,
} from '@/lib/hiring/emailTemplates';
import { APPLICATION_STAGES } from '@/lib/hiring/forms';
import { cn } from '@/lib/utils';
import {
  type APPLICATION_STAGE,
  HIRING_EMAIL_STATUS,
  type HiringEmail,
  type HiringEmailTemplate,
} from '@/models/hiring';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  ConfirmDialog,
  EmptyState,
  Field,
  Icon,
  IconAction,
  NativeSelect,
  Panel,
  Pill,
  Segmented,
  SkeletonRows,
  TextArea,
  TextInput,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import {
  EMAIL_STATUS_META,
  type HiringSectionProps,
  STAGE_META,
  timeAgo,
} from './hiringMeta';

type Draft = {
  id: string | null;
  name: string;
  subject: string;
  body: string;
  moveTo: APPLICATION_STAGE | '';
};

const UNDELIVERED = [
  HIRING_EMAIL_STATUS.BOUNCED,
  HIRING_EMAIL_STATUS.COMPLAINED,
  HIRING_EMAIL_STATUS.FAILED,
];

type StatusFilter = 'ALL' | 'UNDELIVERED' | 'UNOPENED' | 'OPENED';

const STATUS_FILTERS: Record<StatusFilter, HIRING_EMAIL_STATUS[] | null> = {
  ALL: null,
  UNDELIVERED,
  // Sent or delivered but never opened: worth a nudge, or a missed reply.
  UNOPENED: [
    HIRING_EMAIL_STATUS.SENT,
    HIRING_EMAIL_STATUS.DELIVERED,
    HIRING_EMAIL_STATUS.DELAYED,
  ],
  OPENED: [HIRING_EMAIL_STATUS.OPENED, HIRING_EMAIL_STATUS.CLICKED],
};

/** The company's saved templates, and the starters every company has. */
const Templates = ({
  companyId,
  canEdit,
}: {
  companyId: string;
  canEdit: boolean;
}) => {
  const [templates, setTemplates] = useState<HiringEmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<HiringEmailTemplate | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await PortalSdk.getData(
        `/api/hiring/email-templates?companyId=${companyId}`,
        null,
      );
      setTemplates(res?.data?.templates ?? []);
    } catch (err) {
      toast.error(errorText(err, 'Could not load templates.'));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const body = {
      companyId,
      name: draft.name,
      subject: draft.subject,
      body: draft.body,
      moveTo: draft.moveTo || null,
    };
    try {
      if (draft.id) {
        const res = await PortalSdk.patchData(
          `/api/hiring/email-templates/${draft.id}`,
          body,
        );
        setTemplates((rows) =>
          rows.map((t) => (t.id === draft.id ? res.data.template : t)),
        );
      } else {
        const res = await PortalSdk.postData(
          '/api/hiring/email-templates',
          body,
        );
        setTemplates((rows) =>
          [...rows, res.data.template].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );
      }
      toast.success('Template saved');
      setDraft(null);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await PortalSdk.deleteData(
        `/api/hiring/email-templates/${deleting.id}`,
        {},
      );
      setTemplates((rows) => rows.filter((t) => t.id !== deleting.id));
      toast.success('Template deleted');
      setDeleting(null);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const Row = ({
    icon,
    name,
    subject,
    moveTo,
    badge,
    actions,
    onOpen,
  }: {
    icon: string;
    name: string;
    subject: string;
    moveTo?: APPLICATION_STAGE | null;
    badge?: string;
    actions?: React.ReactNode;
    onOpen: () => void;
  }) => (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[17px] text-neutral-300">
        <Icon name={icon} />
      </span>
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral-100">{name}</span>
          {badge && <Pill>{badge}</Pill>}
          {moveTo && (
            <span className="text-[11px] text-neutral-500">
              moves to {STAGE_META[moveTo]?.label}
            </span>
          )}
        </span>
        <span className="block truncate text-xs text-neutral-500">
          {subject}
        </span>
      </button>
      {actions}
    </li>
  );

  return (
    <div className="flex flex-col gap-4">
      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-neutral-100">
              Your templates
            </p>
            <p className="text-xs text-neutral-500">
              Saved for everyone in the company. The composer lists them too.
            </p>
          </div>
          {canEdit && (
            <AdminButton
              size="sm"
              tone="primary"
              icon="add"
              onClick={() =>
                setDraft({
                  id: null,
                  name: '',
                  subject: '',
                  body: '',
                  moveTo: '',
                })
              }
            >
              New template
            </AdminButton>
          )}
        </div>
        {loading ? (
          <SkeletonRows rows={3} />
        ) : templates.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-neutral-500">
            No saved templates yet. Start from a starter below, or write one.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {templates.map((t) => (
              <Row
                key={t.id}
                icon="drafts"
                name={t.name}
                subject={t.subject}
                moveTo={t.moveTo}
                onOpen={() =>
                  setDraft({
                    id: t.id,
                    name: t.name,
                    subject: t.subject,
                    body: t.body,
                    moveTo: t.moveTo ?? '',
                  })
                }
                actions={
                  canEdit && (
                    <IconAction
                      icon="delete"
                      tone="danger"
                      label="Delete template"
                      onClick={() => setDeleting(t)}
                    />
                  )
                }
              />
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="overflow-hidden">
        <div className="border-b border-white/[0.07] px-4 py-3">
          <p className="text-sm font-semibold text-neutral-100">Starters</p>
          <p className="text-xs text-neutral-500">
            Built in. Open one to save your own copy.
          </p>
        </div>
        <ul className="divide-y divide-white/[0.05]">
          {STARTER_TEMPLATES.map((t) => (
            <Row
              key={t.key}
              icon={t.icon}
              name={t.name}
              subject={t.subject}
              moveTo={t.moveTo}
              badge="Starter"
              onOpen={() =>
                setDraft({
                  id: null,
                  name: `${t.name} (ours)`.slice(0, MAX_TEMPLATE_NAME),
                  subject: t.subject,
                  body: t.body,
                  moveTo: t.moveTo ?? '',
                })
              }
            />
          ))}
        </ul>
      </Panel>

      <AdminModal
        open={!!draft}
        onOpenChange={(open) => !open && setDraft(null)}
        size="lg"
        icon="drafts"
        title={draft?.id ? 'Edit template' : 'New template'}
        footer={
          <div className="flex justify-end gap-2">
            <AdminButton tone="ghost" onClick={() => setDraft(null)}>
              {canEdit ? 'Cancel' : 'Close'}
            </AdminButton>
            {canEdit && (
              <AdminButton
                tone="primary"
                loading={saving}
                disabled={
                  !draft?.name.trim() ||
                  !draft?.subject.trim() ||
                  !draft?.body.trim()
                }
                onClick={save}
              >
                Save template
              </AdminButton>
            )}
          </div>
        }
      >
        {draft && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
              <Field label="Name" required>
                <TextInput
                  value={draft.name}
                  maxLength={MAX_TEMPLATE_NAME}
                  disabled={!canEdit}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
              <Field label="After sending, move to">
                <NativeSelect
                  value={draft.moveTo}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      moveTo: e.target.value as APPLICATION_STAGE | '',
                    })
                  }
                >
                  <option value="">Don’t move</option>
                  {APPLICATION_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_META[s].label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field label="Subject" required>
              <TextInput
                value={draft.subject}
                maxLength={MAX_SUBJECT}
                disabled={!canEdit}
                onChange={(e) =>
                  setDraft({ ...draft, subject: e.target.value })
                }
              />
            </Field>
            <Field
              label="Body"
              required
              hint={
                <span className="flex flex-wrap gap-1">
                  Placeholders:
                  {EMAIL_VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      disabled={!canEdit}
                      title={v.label}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          body: `${draft.body}{{${v.key}}}`,
                        })
                      }
                      className="rounded bg-white/[0.06] px-1.5 font-mono text-[10px] text-neutral-300 hover:bg-white/10"
                    >
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </span>
              }
            >
              <TextArea
                value={draft.body}
                maxLength={MAX_BODY}
                disabled={!canEdit}
                rows={12}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
            </Field>
          </div>
        )}
      </AdminModal>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'template'}?`}
        message="Emails already sent with it are kept."
        confirmLabel="Delete"
        loading={saving}
        onConfirm={remove}
      />
    </div>
  );
};

/** Every email sent to candidates, across openings, with where it got to. */
const SentMail = ({
  companyId,
  users,
  openApplicant,
}: Pick<HiringSectionProps, 'companyId' | 'users' | 'openApplicant'>) => {
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [emails, setEmails] = useState<HiringEmail[]>([]);
  const [applications, setApplications] = useState<
    Array<{
      id: string;
      name: string;
      stage: APPLICATION_STAGE;
      openingId: string;
    }>
  >([]);
  const [openings, setOpenings] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [openingId, setOpeningId] = useState('');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    PortalSdk.getData(
      `/api/hiring/openings?companyId=${companyId}&includeArchived=true`,
      null,
    )
      .then((res) => setOpenings(res?.data?.openings ?? []))
      .catch(() => setOpenings([]));
  }, [companyId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const statuses = STATUS_FILTERS[filter];
      const params = new URLSearchParams({ companyId });
      if (statuses) params.set('status', statuses.join(','));
      if (openingId) params.set('openingId', openingId);
      const res = await PortalSdk.getData(`/api/hiring/emails?${params}`, null);
      setEmails(res?.data?.emails ?? []);
      setApplications(res?.data?.applications ?? []);
    } catch (err) {
      toast.error(errorText(err, 'Could not load sent mail.'));
    } finally {
      setLoading(false);
    }
  }, [companyId, filter, openingId]);

  useEffect(() => {
    load();
  }, [load]);

  const appOf = useMemo(
    () => new Map(applications.map((a) => [a.id, a])),
    [applications],
  );
  const titleOf = useMemo(
    () => new Map(openings.map((o) => [o.id, o.title])),
    [openings],
  );
  const nameOf = (id: string) =>
    users.find((u) => u.id === id)?.name || 'A teammate';
  const undelivered = emails.filter((e) =>
    UNDELIVERED.includes(e.status),
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={filter}
          onChange={setFilter}
          className="max-w-full overflow-x-auto"
          options={[
            { value: 'ALL', label: 'All' },
            {
              value: 'UNDELIVERED',
              label: 'Didn’t arrive',
              icon: 'unsubscribe',
            },
            {
              value: 'UNOPENED',
              label: 'Not opened',
              icon: 'mark_email_unread',
            },
            { value: 'OPENED', label: 'Opened', icon: 'mark_email_read' },
          ]}
        />
        <div className="flex-1" />
        <NativeSelect
          aria-label="Opening"
          value={openingId}
          onChange={(e) => setOpeningId(e.target.value)}
          className="h-9 w-52 text-xs"
        >
          <option value="">Every opening</option>
          {openings.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ))}
        </NativeSelect>
      </div>
      {filter === 'ALL' && undelivered > 0 && (
        <button
          type="button"
          onClick={() => setFilter('UNDELIVERED')}
          className="flex items-center gap-2 self-start rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
        >
          <Icon name="unsubscribe" className="text-[16px]" />
          {undelivered} {undelivered === 1 ? 'email' : 'emails'} didn’t arrive.
          Show them
        </button>
      )}
      <Panel className="overflow-hidden">
        {loading ? (
          <SkeletonRows rows={5} />
        ) : emails.length === 0 ? (
          <EmptyState
            icon="outbox"
            title="No emails here"
            description="Emails you send to candidates from Hiring show up here with their delivery status."
          />
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {emails.map((email) => {
              const status = EMAIL_STATUS_META[email.status];
              const app = appOf.get(email.applicationId);
              const expanded = openId === email.id;
              return (
                <li key={email.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(expanded ? null : email.id)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.03]"
                  >
                    <Icon
                      name={expanded ? 'expand_less' : 'expand_more'}
                      className="text-[18px] text-neutral-500"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-neutral-100">
                        <span className="font-medium">
                          {app?.name ?? email.to}
                        </span>
                        <span className="text-neutral-500">
                          {' '}
                          · {email.subject}
                        </span>
                      </span>
                      <span className="block truncate text-[11px] text-neutral-500">
                        {titleOf.get(email.openingId) ?? 'An opening'} ·{' '}
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
                    <div className="flex flex-col gap-2 px-4 pb-3 pl-11">
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
                      {app && (
                        <AdminButton
                          size="sm"
                          tone="ghost"
                          icon="person"
                          className="self-start"
                          onClick={() =>
                            openApplicant({
                              id: app.id,
                              openingId: app.openingId,
                            })
                          }
                        >
                          Open {app.name.split(/\s+/)[0]} (to send again)
                        </AdminButton>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      <p className="text-[11px] text-neutral-600">
        The latest 500. Opened and clicked need the delivery webhook; without it
        emails stay at Sent.
      </p>
    </div>
  );
};

/** Saved templates on one side, everything sent on the other. */
export const HiringEmails = (props: HiringSectionProps) => {
  const [tab, setTab] = useState<'templates' | 'sent'>('sent');
  return (
    <div className="flex flex-col gap-4">
      <Segmented
        value={tab}
        onChange={setTab}
        className={cn('self-start')}
        options={[
          { value: 'sent', label: 'Sent mail', icon: 'outbox' },
          { value: 'templates', label: 'Templates', icon: 'drafts' },
        ]}
      />
      {tab === 'templates' ? (
        <Templates companyId={props.companyId} canEdit={props.canEdit} />
      ) : (
        <SentMail
          companyId={props.companyId}
          users={props.users}
          openApplicant={props.openApplicant}
        />
      )}
    </div>
  );
};
