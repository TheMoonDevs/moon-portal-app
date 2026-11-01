'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  DOC_PLACEHOLDERS,
  fillDocument,
  unknownDocPlaceholders,
} from '@/lib/onboarding/documents';
import { cn } from '@/lib/utils';
import type { ONBOARDING_DOC_KIND } from '@/models/onboarding';
import { HIRE_TYPE } from '@/models/onboarding';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  Icon,
  Panel,
  Pill,
  Segmented,
  SkeletonRows,
  TextInput,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import {
  type BoardData,
  type DocTemplate,
  previewVariables,
} from './onboardingClient';
import { Paper } from './OnboardingDialogs';

/**
 * Onboarding > Documents: the company's Trial Policy, NDA, Offer Letter and
 * Work Agreement. Each is Markdown with {{placeholders}} filled from the
 * terms at send time. Documents already sent keep their text.
 */
export const DocumentTemplates = ({
  companyId,
  board,
  canEdit,
}: {
  companyId: string;
  board: BoardData;
  canEdit: boolean;
}) => {
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<ONBOARDING_DOC_KIND | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [saving, setSaving] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await PortalSdk.getData(
        `/api/onboarding/templates?companyId=${companyId}`,
        null,
      );
      const list: DocTemplate[] = res?.data?.templates ?? [];
      setTemplates(list);
      setKind((k) => k ?? list[0]?.kind ?? null);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const current = templates.find((t) => t.kind === kind) ?? null;
  useEffect(() => {
    setTitle(current?.title ?? '');
    setBody(current?.body ?? '');
  }, [current]);

  const dirty = !!current && (title !== current.title || body !== current.body);
  const unknown = unknownDocPlaceholders(body);

  const insert = (key: string) => {
    const el = area.current;
    const token = `{{${key}}}`;
    if (!el) return setBody((b) => b + token);
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + token + body.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const save = async () => {
    if (!kind) return;
    setSaving(true);
    try {
      await PortalSdk.putData('/api/onboarding/templates', {
        companyId,
        kind,
        title,
        body,
      });
      toast.success('Saved. The next hire gets this wording.');
      await load();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!kind) return;
    setSaving(true);
    try {
      await PortalSdk.deleteData(
        `/api/onboarding/templates?companyId=${companyId}&kind=${kind}`,
        null,
      );
      toast.success('Back to the starting draft');
      await load();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const sample = previewVariables(
    board,
    { name: 'Asha Verma', email: 'asha@example.com', details: null },
    {
      companyName: board.companyName,
      role: 'HR & Administration Intern',
      hireType: HIRE_TYPE.INTERN,
      monthlyPay: '20000',
      currency: 'INR',
      startDate: new Date().toISOString().slice(0, 10),
      projectId: board.projects[0]?.id ?? '',
      location: 'Remote',
      leadId: board.people[0]?.id ?? '',
      buddyId: '',
    },
    {
      role: 'HR & Administration Associate',
      hireType: HIRE_TYPE.FULL_TIME,
      monthlyPay: 35000,
      currency: 'INR',
      joiningDate: new Date().toISOString().slice(0, 10),
      noticeDays: 15,
      note: '',
    },
  );

  if (loading && !templates.length)
    return (
      <Panel>
        <SkeletonRows rows={4} />
      </Panel>
    );

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3 text-xs text-amber-100/90">
        <Icon name="gavel" className="mt-0.5 text-[16px] text-amber-300" />
        These start as drafts written for the portal. Have them checked by
        whoever handles your legal terms before the first real hire, or paste
        your own text. Documents already sent keep the words they were sent
        with.
      </p>
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="flex gap-2 overflow-x-auto lg:flex-col">
          {templates.map((t) => (
            <button
              key={t.kind}
              type="button"
              onClick={() => setKind(t.kind)}
              className={cn(
                'flex min-w-[180px] flex-col gap-1 rounded-xl border px-3 py-3 text-left transition-colors',
                kind === t.kind
                  ? 'border-white/20 bg-white/[0.07]'
                  : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15',
              )}
            >
              <span className="text-sm text-white">{t.label}</span>
              <span className="flex items-center gap-2 text-[11px] text-neutral-500">
                {t.custom ? (
                  <Pill tone="info">Your wording</Pill>
                ) : (
                  <Pill>Starting draft</Pill>
                )}
                {['TRIAL_POLICY', 'NDA'].includes(t.kind)
                  ? 'Before access'
                  : 'After the trial'}
              </span>
            </button>
          ))}
        </div>

        {current && (
          <Panel className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] px-4 py-3">
              <TextInput
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canEdit}
                className="h-9 max-w-xs flex-1 font-medium"
              />
              <div className="flex-1" />
              <Segmented
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'edit', label: 'Edit', icon: 'edit' },
                  { value: 'preview', label: 'Preview', icon: 'visibility' },
                ]}
              />
            </div>
            {mode === 'edit' ? (
              <div className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap gap-1.5">
                  {DOC_PLACEHOLDERS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      title={p.label}
                      disabled={!canEdit}
                      onClick={() => insert(p.key)}
                      className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] text-neutral-400 transition-colors hover:border-white/25 hover:text-white disabled:opacity-40"
                    >
                      {`{{${p.key}}}`}
                    </button>
                  ))}
                </div>
                <textarea
                  ref={area}
                  value={body}
                  readOnly={!canEdit}
                  onChange={(e) => setBody(e.target.value)}
                  spellCheck
                  className="custom-scrollbar min-h-[460px] w-full resize-y rounded-lg border border-white/10 bg-neutral-900/80 p-4 font-mono text-[13px] leading-relaxed text-neutral-200 focus:border-white/25 focus:outline-none"
                />
                {unknown.length > 0 && (
                  <p className="text-xs text-rose-300">
                    Unknown placeholders:{' '}
                    {unknown.map((u) => `{{${u}}}`).join(', ')}
                  </p>
                )}
              </div>
            ) : (
              <div className="custom-scrollbar max-h-[640px] overflow-y-auto bg-neutral-800/30 p-4">
                <Paper
                  body={fillDocument(body, sample).replace(/\n{3,}/g, '\n\n')}
                />
                <p className="mt-3 text-center text-[11px] text-neutral-500">
                  Filled with sample values.
                </p>
              </div>
            )}
            {canEdit && (
              <div className="flex items-center justify-end gap-2 border-t border-white/[0.07] px-4 py-3">
                {current.custom && (
                  <AdminButton
                    size="sm"
                    tone="ghost"
                    icon="restart_alt"
                    disabled={saving}
                    onClick={reset}
                  >
                    Back to the draft
                  </AdminButton>
                )}
                <AdminButton
                  size="sm"
                  tone="primary"
                  icon="save"
                  loading={saving}
                  disabled={!dirty || unknown.length > 0}
                  onClick={save}
                >
                  Save
                </AdminButton>
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
};
