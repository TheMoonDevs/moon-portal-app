'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DOC_TYPES } from '@/lib/agreements/docTypes';
import type { TemplateView } from '@/lib/agreements/server';
import type { SettingsView } from '@/lib/agreements/signers';
import {
  fieldLabel,
  isPersonKey,
  templateFields,
} from '@/lib/agreements/templates';
import type { RequiredChecklist } from '@/lib/agreements/vault';
import { cn } from '@/lib/utils';
import type { RequiredDocument } from '@/models/agreements';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  EmptyState,
  Field,
  Icon,
  IconAction,
  NativeSelect,
  Panel,
  PanelHeader,
  Pill,
  SkeletonRows,
  TextInput,
  UserAvatar,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';

/*
 * Administration > Required documents: what each role must have signed (an
 * NDA for everyone, the IT policy for interns), who is missing what, and one
 * button to send the missing ones. A required document can also have to be
 * signed before someone uses the Portal.
 */

type Draft = RequiredDocument;

/** What counts: any document of a type, or one of the company's templates. */
const valueOf = (r: Draft) =>
  r.rolloutId
    ? `rollout:${r.rolloutId}`
    : r.templateId && !r.templateId.startsWith('starter:')
      ? `tpl:${r.templateId}`
      : `type:${r.typeKey}`;

const STATE_ICON = {
  signed: { icon: 'task_alt', className: 'text-emerald-300', label: 'Signed' },
  waiting: {
    icon: 'pending',
    className: 'text-amber-300',
    label: 'Out for signing',
  },
  missing: { icon: 'cancel', className: 'text-rose-300', label: 'Missing' },
} as const;

const SendMissingDialog = ({
  req,
  template,
  companyId,
  onClose,
  onSent,
}: {
  req: RequiredChecklist['requirements'][number] | null;
  template: TemplateView | null;
  companyId: string;
  onClose: () => void;
  onSent: () => void;
}) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => setValues({}), [req]);
  const blanks = useMemo(
    () =>
      template
        ? templateFields(template.title, template.body).filter(
            (k) => !isPersonKey(k),
          )
        : [],
    [template],
  );
  if (!req) return null;
  const missing = blanks.filter((k) => !values[k]?.trim());

  const send = async () => {
    setBusy(true);
    try {
      let sent = 0;
      const failed: Array<{ name: string; error: string }> = [];
      // A batch at a time, until everyone missing it has it.
      for (let round = 0; round < 20; round++) {
        const res = await PortalSdk.postData('/api/documents/checklist', {
          companyId,
          requirementId: req.id,
          values,
        });
        sent += res.data.sent.length;
        failed.push(...res.data.failed);
        if (!res.data.remaining || !res.data.sent.length) break;
      }
      if (failed.length)
        toast.warning(
          `Sent to ${sent}. ${failed.length} not sent: ${failed[0].name}, ${failed[0].error}`,
        );
      else
        toast.success(`Sent to ${sent} ${sent === 1 ? 'person' : 'people'}.`);
      onSent();
      onClose();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminModal
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Send ${req.label} to ${req.missing} ${req.missing === 1 ? 'person' : 'people'}`}
      description={
        template
          ? `From ${template.name}. Each person's own details fill in from their records.`
          : 'From its rollout.'
      }
      icon="send"
      footer={
        <AdminButton
          size="sm"
          tone="primary"
          icon="send"
          loading={busy}
          disabled={!!missing.length}
          onClick={send}
        >
          Send
        </AdminButton>
      }
    >
      {blanks.length ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-neutral-500">
            Filled in once, the same for everyone:
          </p>
          {blanks.map((k) => (
            <Field key={k} label={fieldLabel(k)} required>
              <TextInput
                value={values[k] ?? ''}
                onChange={(e) => setValues({ ...values, [k]: e.target.value })}
              />
            </Field>
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-300">
          Everyone missing it gets their own link by email.
          {req.blocking ? ' They sign it before using the Portal.' : ''}
        </p>
      )}
    </AdminModal>
  );
};

export const RequiredDocsView = ({
  companyId,
  settings,
  templates,
  canEdit,
  canCreate,
  onSaved,
}: {
  companyId: string;
  settings: SettingsView | null;
  templates: TemplateView[];
  canEdit: boolean;
  canCreate: boolean;
  onSaved: (s: SettingsView) => void;
}) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState<RequiredChecklist | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [filter, setFilter] = useState<'missing' | 'all'>('missing');

  useEffect(() => {
    if (settings) setDrafts(settings.required.map((r) => ({ ...r })));
  }, [settings]);

  const load = useCallback(() => {
    PortalSdk.getData(`/api/documents/checklist?companyId=${companyId}`, null)
      .then((res) => setList(res?.data?.checklist ?? null))
      .catch((err) => toast.error(errorText(err)));
  }, [companyId]);

  useEffect(() => {
    setList(null);
    load();
  }, [load]);

  const own = templates.filter((t) => !t.builtIn);
  const starterFor = (typeKey: string | null) =>
    templates.find((t) => t.builtIn && t.category === typeKey) ?? null;
  const roleName = (key: string) =>
    settings?.roles.find((r) => r.key === key)?.name ?? key;

  const dirty =
    !!settings && JSON.stringify(drafts) !== JSON.stringify(settings.required);

  const set = (i: number, patch: Partial<Draft>) =>
    setDrafts((all) => all.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const pick = (i: number, v: string) => {
    if (v.startsWith('tpl:')) {
      const t = own.find((x) => x.id === v.slice(4));
      set(i, {
        templateId: t?.id ?? null,
        typeKey: t?.category ?? null,
        rolloutId: null,
        label: drafts[i].label || t?.name || 'Document',
      });
    } else if (v.startsWith('type:')) {
      const key = v.slice(5);
      const type = DOC_TYPES.find((t) => t.key === key);
      set(i, {
        typeKey: key,
        templateId: starterFor(key)?.id ?? null,
        rolloutId: null,
        label: drafts[i].label || type?.label || 'Document',
      });
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await PortalSdk.putData('/api/agreements/settings', {
        companyId,
        required: drafts,
      });
      onSaved(res.data.settings);
      toast.success('Required documents saved');
      load();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const people = (list?.people ?? []).filter(
    (p) => filter === 'all' || p.missing > 0 || p.waiting > 0,
  );
  const sendingReq = list?.requirements.find((r) => r.id === sending) ?? null;
  const sendingTemplate = sendingReq?.templateId
    ? (templates.find((t) => t.id === sendingReq.templateId) ?? null)
    : null;

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <PanelHeader
          icon="checklist"
          title="What each role must have signed"
          description="With no roles picked, it's for everyone but the owners, who sign for the company. A document signed before the Portal counts once it's imported."
          actions={
            canEdit && (
              <AdminButton
                size="sm"
                tone="primary"
                icon="save"
                loading={saving}
                disabled={!dirty}
                onClick={save}
              >
                Save
              </AdminButton>
            )
          }
        />
        {!settings ? (
          <SkeletonRows rows={2} />
        ) : (
          <div className="flex flex-col gap-2 p-4">
            {drafts.map((d, i) => (
              <div
                key={i}
                className="flex flex-col gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"
              >
                <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]">
                  <TextInput
                    aria-label="Name"
                    value={d.label}
                    disabled={!canEdit}
                    onChange={(e) => set(i, { label: e.target.value })}
                  />
                  <NativeSelect
                    aria-label="What counts"
                    value={valueOf(d)}
                    disabled={!canEdit || !!d.rolloutId}
                    onChange={(e) => pick(i, e.target.value)}
                  >
                    {d.rolloutId && (
                      <option value={`rollout:${d.rolloutId}`}>
                        Its policy rollout
                      </option>
                    )}
                    <optgroup label="Any document of the kind">
                      {DOC_TYPES.map((t) => (
                        <option key={t.key} value={`type:${t.key}`}>
                          Any {t.label}
                        </option>
                      ))}
                    </optgroup>
                    {own.length > 0 && (
                      <optgroup label="Signed from our template">
                        {own.map((t) => (
                          <option key={t.id} value={`tpl:${t.id}`}>
                            {t.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </NativeSelect>
                  {canEdit && (
                    <IconAction
                      icon="delete"
                      label="Remove"
                      onClick={() =>
                        setDrafts((all) => all.filter((_, j) => j !== i))
                      }
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[11px] text-neutral-500">For</span>
                  {(settings.roles ?? []).map((r) => {
                    const on = d.roles.includes(r.key);
                    return (
                      <button
                        key={r.key}
                        type="button"
                        disabled={!canEdit}
                        onClick={() =>
                          set(i, {
                            roles: on
                              ? d.roles.filter((k) => k !== r.key)
                              : [...d.roles, r.key],
                          })
                        }
                        className={cn(
                          'h-7 rounded-full border px-2.5 text-[11px] transition-colors',
                          on
                            ? 'border-sky-400/40 bg-sky-500/15 text-sky-100'
                            : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:text-neutral-200',
                        )}
                      >
                        {r.name}
                      </button>
                    );
                  })}
                  {!d.roles.length && (
                    <Pill tone="info">Everyone but owners</Pill>
                  )}
                  <span className="flex-1" />
                  <label className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <input
                      type="checkbox"
                      checked={d.blocking}
                      disabled={!canEdit}
                      onChange={(e) => set(i, { blocking: e.target.checked })}
                      className="accent-emerald-500"
                    />
                    Signed before using the Portal
                  </label>
                </div>
                {!d.templateId && !d.rolloutId && (
                  <p className="text-[11px] text-neutral-500">
                    Sent through onboarding, not from here.
                  </p>
                )}
              </div>
            ))}
            {canEdit && (
              <AdminButton
                size="sm"
                tone="ghost"
                icon="add"
                className="self-start"
                onClick={() =>
                  setDrafts((all) => [
                    ...all,
                    {
                      id: `req${Date.now().toString(36)}`,
                      label: '',
                      typeKey: 'POLICY',
                      templateId: starterFor('POLICY')?.id ?? null,
                      rolloutId: null,
                      roles: [],
                      blocking: false,
                    },
                  ])
                }
              >
                Add a required document
              </AdminButton>
            )}
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHeader
          icon="fact_check"
          title="Who has signed what"
          description={
            list
              ? `${list.people.filter((p) => p.missing > 0).length} of ${list.people.length} people are missing something.`
              : undefined
          }
          actions={
            <NativeSelect
              aria-label="Show"
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'missing' | 'all')}
              className="h-8 w-auto text-xs"
            >
              <option value="missing">Not done yet</option>
              <option value="all">Everyone</option>
            </NativeSelect>
          }
        />
        {!list ? (
          <SkeletonRows rows={4} />
        ) : !list.requirements.length ? (
          <EmptyState
            icon="checklist"
            title="Nothing is required yet"
            description="Add what each role must sign above."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-[11px] uppercase tracking-wide text-neutral-500">
                  <th className="px-4 py-2.5 font-medium">Person</th>
                  {list.requirements.map((q) => (
                    <th key={q.id} className="px-3 py-2.5 font-medium">
                      <span className="block normal-case tracking-normal text-neutral-300">
                        {q.label}
                      </span>
                      <span className="block font-normal normal-case tracking-normal">
                        {q.signed} signed · {q.missing} missing
                      </span>
                      {canCreate && q.sendable && q.missing > 0 && (
                        <button
                          type="button"
                          onClick={() => setSending(q.id)}
                          className="mt-1 inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-neutral-100 hover:bg-white/[0.09]"
                        >
                          <Icon name="send" className="text-[13px]" />
                          Send to {q.missing}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {!people.length ? (
                  <tr>
                    <td
                      colSpan={list.requirements.length + 1}
                      className="px-4 py-8 text-center text-sm text-neutral-400"
                    >
                      Everyone has signed what they need.
                    </td>
                  </tr>
                ) : (
                  people.map((p) => (
                    <tr key={p.userId}>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2.5">
                          <UserAvatar src={p.avatar} name={p.name} size={28} />
                          <span className="min-w-0">
                            <span className="block truncate text-white">
                              {p.name}
                            </span>
                            <span className="block truncate text-[11px] text-neutral-500">
                              {p.roleKeys.map(roleName).join(', ') || p.email}
                            </span>
                          </span>
                        </span>
                      </td>
                      {list.requirements.map((q) => {
                        const it = p.items[q.id];
                        if (!it)
                          return (
                            <td
                              key={q.id}
                              className="px-3 py-2.5 text-xs text-neutral-600"
                            >
                              Not needed
                            </td>
                          );
                        const meta = STATE_ICON[it.state];
                        return (
                          <td key={q.id} className="px-3 py-2.5">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 text-xs',
                                meta.className,
                              )}
                            >
                              <Icon name={meta.icon} className="text-[16px]" />
                              {meta.label}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {sendingReq && (
        <SendMissingDialog
          req={sendingReq}
          template={sendingTemplate}
          companyId={companyId}
          onClose={() => setSending(null)}
          onSent={load}
        />
      )}
    </div>
  );
};
