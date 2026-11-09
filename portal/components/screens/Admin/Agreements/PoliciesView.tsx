'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { RolloutView } from '@/lib/agreements/rollouts';
import type { TemplateView } from '@/lib/agreements/server';
import type { SettingsView } from '@/lib/agreements/signers';
import {
  fieldLabel,
  isPersonKey,
  templateFields,
} from '@/lib/agreements/templates';
import { cn } from '@/lib/utils';
import { AGREEMENT_CATEGORY } from '@/models/agreements';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { Paper } from '../Onboarding/OnboardingDialogs';
import {
  AdminButton,
  AdminModal,
  ConfirmDialog,
  EmptyState,
  Field,
  Icon,
  NativeSelect,
  Panel,
  PanelHeader,
  Pill,
  SkeletonRows,
  TextArea,
  TextInput,
  ToggleSwitch,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import { day, when } from './meta';

/*
 * Agreements > Policies: send a policy to everyone, a role or a project team
 * to acknowledge, see who has, chase the rest. People who join later get it
 * too. Acknowledgements need no countersignature.
 */

const BLANK_POLICY =
  '# {{policyName}}\n\n{{policyText}}\n\n---\n\nI, **{{signer1Name}}**, confirm that I have read and understood the {{policyName}} of **{{companyName}}**, and that I will follow it.\n';

type Draft = {
  templateId: string | null;
  title: string;
  body: string;
  values: Record<string, string>;
  audience: string;
  includeNewPeople: boolean;
  blocking: boolean;
  daysToSign: string;
  message: string;
};

type Preview = {
  title: string;
  text: string;
  exampleFor: string | null;
  stillBlank: Array<{ key: string; label: string }>;
  people: Array<{ name: string; email: string }>;
};

const audienceOf = (a: string) =>
  a === 'everyone'
    ? { kind: 'everyone' }
    : a.startsWith('role:')
      ? { kind: 'role', roleKey: a.slice(5) }
      : { kind: 'project', projectId: a.slice(8) };

const RolloutDialog = ({
  open,
  onOpenChange,
  companyId,
  templates,
  settings,
  onStarted,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyId: string;
  templates: TemplateView[];
  settings: SettingsView | null;
  onStarted: (id: string) => void;
}) => {
  const policies = templates.filter(
    (t) => t.category === AGREEMENT_CATEGORY.POLICY,
  );
  const [draft, setDraft] = useState<Draft | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t =
      policies.find((p) => p.id === 'starter:policy-acknowledgement') ??
      policies[0];
    setDraft({
      templateId: t?.id ?? null,
      title: t?.title ?? 'Policy acknowledgement',
      body: t?.body ?? BLANK_POLICY,
      values: {},
      audience: 'everyone',
      includeNewPeople: true,
      blocking: false,
      daysToSign: '14',
      message: '',
    });
    setPreview(null);
    // Only when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const blanks = useMemo(
    () =>
      draft
        ? templateFields(draft.title, draft.body).filter((k) => !isPersonKey(k))
        : [],
    [draft],
  );

  if (!draft) return null;
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const payload = () => ({
    companyId,
    templateId: draft.templateId,
    title: draft.title,
    body: draft.body,
    values: draft.values,
    audience: audienceOf(draft.audience),
    includeNewPeople: draft.includeNewPeople,
    blocking: draft.blocking,
    daysToSign: Number(draft.daysToSign) || null,
    message: draft.message,
  });
  const missing = blanks.filter((k) => !draft.values[k]?.trim());

  const showPreview = async () => {
    setBusy(true);
    try {
      const res = await PortalSdk.postData('/api/documents/rollouts', {
        ...payload(),
        preview: true,
      });
      setPreview(res.data.preview);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    setBusy(true);
    try {
      let res = await PortalSdk.postData('/api/documents/rollouts', payload());
      const id: string = res.data.rollout.id;
      let sent: number = res.data.sent.length;
      // A big company: the rest go out a batch at a time.
      while (res.data.remaining > 0 && res.data.sent.length > 0) {
        res = await PortalSdk.putData('/api/documents/rollouts', {
          id,
          action: 'sync',
        });
        sent += res.data.sent.length;
      }
      const failed = res.data.failed?.length ?? 0;
      if (failed)
        toast.warning(
          `Sent to ${sent}. ${failed} could not get it: ${res.data.failed[0].error}`,
        );
      else
        toast.success(`Sent to ${sent} ${sent === 1 ? 'person' : 'people'}.`);
      onStarted(id);
      onOpenChange(false);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      title={preview ? 'Check and send' : 'Roll out a policy'}
      description={
        preview
          ? `${preview.people.length} ${preview.people.length === 1 ? 'person gets' : 'people get'} it, each with their own link.`
          : 'Everyone you pick acknowledges it with their own link. No countersignature.'
      }
      icon="campaign"
      size="lg"
      footer={
        preview ? (
          <>
            <AdminButton
              size="sm"
              tone="ghost"
              onClick={() => setPreview(null)}
            >
              Back
            </AdminButton>
            <AdminButton
              size="sm"
              tone="primary"
              icon="send"
              loading={busy}
              disabled={!preview.people.length}
              onClick={start}
            >
              Send to {preview.people.length}
            </AdminButton>
          </>
        ) : (
          <AdminButton
            size="sm"
            tone="primary"
            icon="visibility"
            loading={busy}
            disabled={
              !draft.title.trim() || !draft.body.trim() || !!missing.length
            }
            onClick={showPreview}
          >
            Preview
          </AdminButton>
        )
      }
    >
      {preview ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            {preview.people.slice(0, 30).map((p) => (
              <Pill key={p.email} icon="person">
                {p.name}
              </Pill>
            ))}
            {preview.people.length > 30 && (
              <Pill>+{preview.people.length - 30} more</Pill>
            )}
          </div>
          {preview.exampleFor && (
            <p className="text-xs text-neutral-500">
              As {preview.exampleFor} will read it. Each person sees their own
              name.
            </p>
          )}
          <Paper title={preview.title} body={preview.text} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Start from">
              <NativeSelect
                value={draft.templateId ?? ''}
                onChange={(e) => {
                  const t = policies.find((p) => p.id === e.target.value);
                  set({
                    templateId: t?.id ?? null,
                    title: t?.title ?? 'Policy acknowledgement',
                    body: t?.body ?? BLANK_POLICY,
                  });
                }}
              >
                {policies.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
                <option value="">Write my own</option>
              </NativeSelect>
            </Field>
            <Field label="Who gets it">
              <NativeSelect
                value={draft.audience}
                onChange={(e) => set({ audience: e.target.value })}
              >
                <option value="everyone">Everyone in the company</option>
                {(settings?.roles ?? []).length > 0 && (
                  <optgroup label="Everyone with the role">
                    {settings!.roles.map((r) => (
                      <option key={r.key} value={`role:${r.key}`}>
                        {r.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {(settings?.projects ?? []).length > 0 && (
                  <optgroup label="A project team">
                    {settings!.projects.map((p) => (
                      <option key={p.id} value={`project:${p.id}`}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </NativeSelect>
            </Field>
          </div>
          {!draft.templateId && (
            <Field label="Title">
              <TextInput
                value={draft.title}
                onChange={(e) => set({ title: e.target.value })}
              />
            </Field>
          )}
          {blanks.length > 0 && (
            <div className="flex flex-col gap-3">
              {blanks.map((k) =>
                k === 'policyText' ? (
                  <Field
                    key={k}
                    label="The policy"
                    required
                    hint="Markdown: # headings, **bold**, - lists."
                  >
                    <TextArea
                      value={draft.values[k] ?? ''}
                      onChange={(e) =>
                        set({
                          values: { ...draft.values, [k]: e.target.value },
                        })
                      }
                      className="min-h-[220px] text-[13px]"
                    />
                  </Field>
                ) : (
                  <Field key={k} label={fieldLabel(k)} required>
                    <TextInput
                      value={draft.values[k] ?? ''}
                      onChange={(e) =>
                        set({
                          values: { ...draft.values, [k]: e.target.value },
                        })
                      }
                    />
                  </Field>
                ),
              )}
            </div>
          )}
          {!draft.templateId && (
            <Field
              label="The text"
              hint="Put {{signer1Name}} where each person's name goes."
            >
              <TextArea
                value={draft.body}
                onChange={(e) => set({ body: e.target.value })}
                className="min-h-[240px] font-mono text-[13px]"
              />
            </Field>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Days to acknowledge it"
              hint="Reminders go out on the way."
            >
              <TextInput
                type="number"
                min={1}
                max={90}
                value={draft.daysToSign}
                onChange={(e) => set({ daysToSign: e.target.value })}
              />
            </Field>
            <Field label="Note in the email">
              <TextInput
                value={draft.message}
                onChange={(e) => set({ message: e.target.value })}
              />
            </Field>
          </div>
          <ToggleSwitch
            checked={draft.includeNewPeople}
            onChange={(v) => set({ includeNewPeople: v })}
            label="People who join later get it too"
            description="Checked daily, and when you press Send to new people."
          />
          <ToggleSwitch
            checked={draft.blocking}
            onChange={(v) => set({ blocking: v })}
            label="They acknowledge it before using the Portal"
            description="Until they do, the Portal opens on this policy."
          />
        </div>
      )}
    </AdminModal>
  );
};

const STATUS_PILL: Record<
  string,
  {
    label: string;
    tone: 'positive' | 'warning' | 'danger' | 'neutral' | 'info';
  }
> = {
  COMPLETED: { label: 'Acknowledged', tone: 'positive' },
  SENT: { label: 'Waiting', tone: 'warning' },
  DECLINED: { label: 'Declined', tone: 'danger' },
  EXPIRED: { label: 'Expired', tone: 'neutral' },
  VOIDED: { label: 'Withdrawn', tone: 'neutral' },
  NOT_SENT: { label: 'Not sent yet', tone: 'info' },
};

export const PoliciesView = ({
  companyId,
  refreshKey,
  templates,
  settings,
  canCreate,
  canEdit,
  onOpen,
  onChanged,
}: {
  companyId: string;
  refreshKey: number;
  templates: TemplateView[];
  settings: SettingsView | null;
  canCreate: boolean;
  canEdit: boolean;
  onOpen: (agreementId: string) => void;
  onChanged: () => void;
}) => {
  const [list, setList] = useState<RolloutView[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [one, setOne] = useState<RolloutView | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const load = useCallback(() => {
    PortalSdk.getData(`/api/documents/rollouts?companyId=${companyId}`, null)
      .then((res) => setList(res?.data?.rollouts ?? []))
      .catch((err) => {
        setList([]);
        toast.error(errorText(err));
      });
  }, [companyId]);

  useEffect(() => {
    setList(null);
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (!selected) return setOne(null);
    PortalSdk.getData(`/api/documents/rollouts?id=${selected}`, null)
      .then((res) => setOne(res?.data?.rollout ?? null))
      .catch((err) => toast.error(errorText(err)));
  }, [selected, refreshKey]);

  const act = async (action: 'remind' | 'sync' | 'close') => {
    if (!one) return;
    setBusy(action);
    try {
      const res = await PortalSdk.putData('/api/documents/rollouts', {
        id: one.id,
        action,
      });
      setOne(res.data.rollout);
      if (action === 'remind')
        toast.success(
          res.data.reminded
            ? `Reminded ${res.data.reminded}.`
            : 'Everyone waiting was reminded today already.',
        );
      if (action === 'sync')
        toast.success(
          res.data.sent.length
            ? `Sent to ${res.data.sent.join(', ')}.`
            : 'Everyone has it already.',
        );
      if (action === 'close') toast.success('Closed. Nobody new gets it.');
      load();
      onChanged();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <Panel className={cn(selected && 'max-lg:hidden')}>
        <PanelHeader
          icon="campaign"
          title="Policy rollouts"
          actions={
            canCreate && (
              <AdminButton
                size="sm"
                tone="primary"
                icon="add"
                onClick={() => setCreating(true)}
              >
                Roll out
              </AdminButton>
            )
          }
        />
        {!list ? (
          <SkeletonRows rows={3} />
        ) : !list.length ? (
          <EmptyState
            icon="campaign"
            title="No rollouts yet"
            description="Send the leave policy, the IT policy or the code of conduct to everyone, and see who has acknowledged it."
          />
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {list.map((r) => {
              const pct = r.counts.total
                ? Math.round((r.counts.acknowledged / r.counts.total) * 100)
                : 0;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(r.id)}
                    className={cn(
                      'flex w-full flex-col gap-1.5 px-4 py-3 text-left hover:bg-white/[0.03]',
                      selected === r.id && 'bg-white/[0.05]',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                        {r.title}
                      </span>
                      {r.status === 'CLOSED' && <Pill>Closed</Pill>}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {r.audienceText} · {day(r.sentAt)}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <span
                          className="block h-full rounded-full bg-emerald-400/80"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        {r.counts.acknowledged} of {r.counts.total}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <div className={cn('min-w-0', !selected && 'max-lg:hidden')}>
        {!selected ? (
          <Panel>
            <EmptyState
              icon="fact_check"
              title="Pick a rollout"
              description="See who has acknowledged it, and remind the rest in one go."
            />
          </Panel>
        ) : !one ? (
          <Panel>
            <SkeletonRows rows={4} />
          </Panel>
        ) : (
          <Panel>
            <div className="flex flex-wrap items-start gap-3 border-b border-white/[0.07] p-4">
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Back to rollouts"
                className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white lg:hidden"
              >
                <Icon name="arrow_back" className="text-[18px]" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-white">
                  {one.title}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {one.audienceText} · sent {day(one.sentAt)} by {one.createdBy}
                  {one.daysToSign
                    ? ` · ${one.daysToSign} days to acknowledge`
                    : ''}
                  {one.includeNewPeople && one.status === 'OPEN'
                    ? ' · new people get it too'
                    : ''}
                  {one.blocking ? ' · before using the Portal' : ''}
                </p>
              </div>
              {canEdit && one.status === 'OPEN' && (
                <div className="flex flex-wrap gap-2">
                  <AdminButton
                    size="sm"
                    tone="ghost"
                    icon="block"
                    onClick={() => setClosing(true)}
                  >
                    Close
                  </AdminButton>
                  {one.counts.notSent > 0 && (
                    <AdminButton
                      size="sm"
                      icon="send"
                      loading={busy === 'sync'}
                      onClick={() => act('sync')}
                    >
                      Send to {one.counts.notSent} new
                    </AdminButton>
                  )}
                  <AdminButton
                    size="sm"
                    tone="primary"
                    icon="notifications_active"
                    loading={busy === 'remind'}
                    disabled={!one.counts.waiting}
                    onClick={() => act('remind')}
                  >
                    Remind {one.counts.waiting}
                  </AdminButton>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-px border-b border-white/[0.07] bg-white/[0.05] sm:grid-cols-4">
              {[
                ['Acknowledged', one.counts.acknowledged],
                ['Waiting', one.counts.waiting],
                ['Not sent yet', one.counts.notSent],
                ['Declined or closed', one.counts.declined + one.counts.closed],
              ].map(([label, n]) => (
                <div key={label as string} className="bg-neutral-950 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                    {label}
                  </p>
                  <p className="text-xl font-semibold text-white">{n}</p>
                </div>
              ))}
            </div>
            <ul className="divide-y divide-white/[0.05]">
              {(one.people ?? []).map((p) => {
                const meta = STATUS_PILL[p.status] ?? STATUS_PILL.SENT;
                return (
                  <li key={p.email || p.name}>
                    <button
                      type="button"
                      disabled={!p.agreementId}
                      onClick={() => p.agreementId && onOpen(p.agreementId)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left enabled:hover:bg-white/[0.03]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{p.name}</p>
                        <p className="truncate text-xs text-neutral-500">
                          {p.email}
                          {p.signedAt
                            ? ` · ${when(p.signedAt)}`
                            : p.remindedAt
                              ? ` · reminded ${when(p.remindedAt)}`
                              : ''}
                        </p>
                      </div>
                      <Pill tone={meta.tone}>{meta.label}</Pill>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}
      </div>

      <RolloutDialog
        open={creating}
        onOpenChange={setCreating}
        companyId={companyId}
        templates={templates}
        settings={settings}
        onStarted={(id) => {
          load();
          setSelected(id);
          onChanged();
        }}
      />
      <ConfirmDialog
        open={closing}
        onOpenChange={setClosing}
        title="Close this rollout?"
        message="Nobody new gets it. People who have it can still acknowledge it."
        confirmLabel="Close it"
        loading={busy === 'close'}
        onConfirm={async () => {
          await act('close');
          setClosing(false);
        }}
      />
    </div>
  );
};
