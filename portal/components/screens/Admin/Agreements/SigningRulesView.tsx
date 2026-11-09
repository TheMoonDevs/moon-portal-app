'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  DOC_TYPES,
  type DocTypeDef,
  SIGNER_RULES,
  signerRuleLabel,
} from '@/lib/agreements/docTypes';
import type { SettingsView } from '@/lib/agreements/signers';
import type {
  CompanySignerRule,
  DocumentTypeSettings,
} from '@/models/agreements';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  Icon,
  NativeSelect,
  Panel,
  Pill,
  ToggleSwitch,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';

/*
 * Who signs each kind of document for the company, and which are
 * confidential. The owner signs most of them once by hand; after that the
 * Portal keeps their signature and they approve with one click. Minor ones
 * (the Trial Policy, policy acknowledgements) the hiring lead signs.
 */

const GROUPS: Array<{ group: DocTypeDef['group']; label: string }> = [
  { group: 'onboarding', label: 'Onboarding documents' },
  { group: 'agreements', label: 'Agreements you send' },
];

export const SigningRulesView = ({
  companyId,
  settings,
  canEdit,
  onSaved,
}: {
  companyId: string;
  settings: SettingsView | null;
  canEdit: boolean;
  onSaved: (s: SettingsView) => void;
}) => {
  const [types, setTypes] = useState<Record<string, DocumentTypeSettings>>({});
  const [signatoryId, setSignatoryId] = useState('');
  const [autoReminders, setAutoReminders] = useState(true);
  const [endAlerts, setEndAlerts] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setTypes(settings.types);
    setSignatoryId(settings.signatory?.id ?? '');
    setAutoReminders(settings.autoReminders);
    setEndAlerts(settings.endAlerts);
  }, [settings]);

  if (!settings)
    return (
      <Panel className="p-6">
        <div className="h-40 animate-pulse rounded-xl bg-white/[0.03]" />
      </Panel>
    );

  const dirty =
    signatoryId !== (settings.signatory?.id ?? '') ||
    autoReminders !== settings.autoReminders ||
    endAlerts !== settings.endAlerts ||
    DOC_TYPES.some(
      (t) =>
        types[t.key]?.signer !== settings.types[t.key]?.signer ||
        types[t.key]?.confidential !== settings.types[t.key]?.confidential,
    );

  const setType = (key: string, patch: Partial<DocumentTypeSettings>) =>
    setTypes((all) => ({ ...all, [key]: { ...all[key], ...patch } }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await PortalSdk.putData('/api/agreements/settings', {
        companyId,
        signatoryId: signatoryId || null,
        autoReminders,
        endAlerts,
        types,
      });
      onSaved(res.data.settings);
      toast.success('Signing rules saved');
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const signatory = settings.owners.find((o) => o.id === signatoryId);
  const savedSignature =
    signatory && settings.signatory?.id === signatory.id
      ? settings.signatory.hasSavedSignature
      : null;

  return (
    <div className="flex flex-col gap-4">
      <Panel className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">
              The owner who signs for the company
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              They sign by hand the first time. The Portal keeps that signature,
              so every document after is one Approve click from Home.
            </p>
          </div>
          <NativeSelect
            aria-label="Company signatory"
            value={signatoryId}
            disabled={!canEdit}
            onChange={(e) => setSignatoryId(e.target.value)}
            className="sm:w-60"
          >
            {!settings.owners.length && <option value="">No owners</option>}
            {settings.owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        {savedSignature !== null && (
          <p className="flex items-center gap-1.5 text-xs">
            {savedSignature ? (
              <>
                <Icon
                  name="verified"
                  className="text-[15px] text-emerald-300"
                />
                <span className="text-neutral-400">
                  {signatory?.name} has a saved signature: they approve with one
                  click.
                </span>
              </>
            ) : (
              <>
                <Icon name="draw" className="text-[15px] text-amber-300" />
                <span className="text-neutral-400">
                  {signatory?.name} hasn&apos;t saved a signature yet. The first
                  document asks them to sign once.
                </span>
              </>
            )}
          </p>
        )}
        <ToggleSwitch
          checked={autoReminders}
          onChange={setAutoReminders}
          disabled={!canEdit}
          label="Remind signers automatically"
          description="Two and five days after it was sent, and the day before it's due. Never more than one email a day."
        />
        <ToggleSwitch
          checked={endAlerts}
          onChange={setEndAlerts}
          disabled={!canEdit}
          label="Warn before agreements end"
          description="The signatory and the sender hear 30 and 7 days before a signed agreement's end date, so it can be renewed."
        />
      </Panel>

      {GROUPS.map((g) => (
        <Panel key={g.group}>
          <div className="grid grid-cols-[minmax(0,1fr)_170px_110px] items-center gap-3 border-b border-white/[0.07] px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500 max-sm:hidden">
            <span>{g.label}</span>
            <span>Signs for the company</span>
            <span>Confidential</span>
          </div>
          <p className="border-b border-white/[0.07] px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500 sm:hidden">
            {g.label}
          </p>
          <ul className="divide-y divide-white/[0.05]">
            {DOC_TYPES.filter((t) => t.group === g.group).map((t) => {
              const v = types[t.key] ?? t.defaults;
              return (
                <li
                  key={t.key}
                  className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_170px_110px]"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm text-white">
                      {t.label}
                      {v.confidential && (
                        <Pill tone="warning" icon="lock">
                          HR and owners
                        </Pill>
                      )}
                    </p>
                    {t.hint && (
                      <p className="text-xs text-neutral-500">{t.hint}</p>
                    )}
                  </div>
                  <NativeSelect
                    aria-label={`Who signs ${t.label} for the company`}
                    value={v.signer}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setType(t.key, {
                        signer: e.target.value as CompanySignerRule,
                      })
                    }
                    className="h-9 text-xs"
                  >
                    {SIGNER_RULES.map((r) => (
                      <option key={r} value={r}>
                        {signerRuleLabel(r, t.group)}
                      </option>
                    ))}
                  </NativeSelect>
                  <ToggleSwitch
                    checked={v.confidential}
                    disabled={!canEdit}
                    onChange={(c) => setType(t.key, { confidential: c })}
                    label={<span className="sm:sr-only">Confidential</span>}
                    className="w-auto justify-between border-0 bg-transparent p-0 hover:border-0 sm:justify-start"
                  />
                </li>
              );
            })}
          </ul>
        </Panel>
      ))}

      <p className="text-xs text-neutral-500">
        Confidential documents, like offer letters and work agreements that
        state pay, are seen only by owners and people with the HR role, and by
        the people who sign them. A change applies to agreements sent from now
        on; onboarding documents follow it straight away.
      </p>

      {canEdit && (
        <div className="sticky bottom-4 flex justify-end">
          <AdminButton
            tone="primary"
            icon="save"
            loading={saving}
            disabled={!dirty}
            onClick={save}
          >
            Save rules
          </AdminButton>
        </div>
      )}
    </div>
  );
};
