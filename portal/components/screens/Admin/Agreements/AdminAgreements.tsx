'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { docTypeLabel, signerRuleLabel } from '@/lib/agreements/docTypes';
import type { AgreementDetail, TemplateView } from '@/lib/agreements/server';
import type { SettingsView } from '@/lib/agreements/signers';
import {
  AGREEMENT_CATEGORIES,
  AUTO_PLACEHOLDERS,
  CATEGORY_LABEL,
  fieldLabel,
  templateFields,
} from '@/lib/agreements/templates';
import type { VaultRow } from '@/lib/agreements/vault';
import { cn } from '@/lib/utils';
import {
  AGREEMENT_CATEGORY,
  AGREEMENT_STATUS,
  type CompanySignerRule,
  SIGNER_STATUS,
} from '@/models/agreements';
import { useUser } from '@/utils/hooks/useUser';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { Paper } from '../Onboarding/OnboardingDialogs';
import {
  AdminButton,
  AdminModal,
  ConfirmDialog,
  CopyButton,
  DateInput,
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
  ToggleSwitch,
} from '../shared/AdminUI';
import { CompanyPicker, errorText, NeedsCompany } from '../Workspace/shared';
import { day, SIGNER_META, STATUS_META, when } from './meta';
import { PeopleView } from './PeopleView';
import { SigningRulesView } from './SigningRulesView';
import { VaultView } from './VaultView';

/*
 * Admin > Agreements: send any agreement to sign (an NDA, a contractor or
 * client agreement, a policy) with the company's own signature added by its
 * rules, follow who has signed, and keep every signed document, onboarding
 * ones included, in one searchable vault with each person's file.
 */

/* ------------------------------ send dialog ------------------------------ */

type SignerRow = { name: string; email: string; role: string; order: number };

const blankSigner = (order: number, role = ''): SignerRow => ({
  name: '',
  email: '',
  role,
  order,
});

/** Who signs for the company on this one: as the rules say, or chosen. */
type CompanyChoice = 'rules' | CompanySignerRule;

export type SendPrefill = {
  to?: { name: string; email: string };
  category?: AGREEMENT_CATEGORY;
};

const SendDialog = ({
  open,
  onOpenChange,
  companyId,
  companyName,
  templates,
  settings,
  prefill,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
  templates: TemplateView[];
  settings: SettingsView | null;
  prefill?: SendPrefill | null;
  onSent: () => void;
}) => {
  const { user } = useUser();
  const [step, setStep] = useState<'pick' | 'write' | 'preview'>('pick');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<AGREEMENT_CATEGORY>(
    AGREEMENT_CATEGORY.OTHER,
  );
  const [signers, setSigners] = useState<SignerRow[]>([blankSigner(1)]);
  const [ordered, setOrdered] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [cc, setCc] = useState('');
  const [companyChoice, setCompanyChoice] = useState<CompanyChoice>('rules');
  const [companyFirst, setCompanyFirst] = useState(false);
  const [confidential, setConfidential] = useState<boolean | null>(null);
  const [editText, setEditText] = useState(false);
  const [preview, setPreview] = useState<{
    title: string;
    body: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('pick');
    setTemplateId(null);
    setPreview(null);
    setEditText(false);
    setValues({});
    setMessage('');
    setExpiresOn('');
    setCc('');
    setOrdered(false);
    setCompanyChoice('rules');
    setCompanyFirst(false);
    setConfidential(null);
  }, [open]);

  const pick = (t: TemplateView) => {
    setTemplateId(t.id);
    setTitle(t.title);
    setBody(t.body);
    setCategory(t.category);
    const rows = t.signerRoles.length
      ? t.signerRoles.map((r, i) => blankSigner(i + 1, r))
      : [blankSigner(1)];
    // Sent to someone from their file: they're the first signer.
    if (prefill?.to) rows[0] = { ...rows[0], ...prefill.to };
    setSigners(rows);
    setStep('write');
  };

  // From a person's file, "Send an NDA" opens on the starter NDA.
  const own = templates.filter((t) => !t.builtIn);
  const starters = templates.filter((t) => t.builtIn);
  const preferred = prefill?.category
    ? [...own, ...starters].filter((t) => t.category === prefill.category)
    : [];

  // The company's signer on this one, as the server will add them.
  const rule: CompanySignerRule =
    companyChoice === 'rules'
      ? (settings?.types[category]?.signer ?? 'owner')
      : companyChoice;
  const companySigner =
    rule === 'none'
      ? null
      : rule === 'lead' && user
        ? { name: user.name || 'You', email: user.email ?? '' }
        : settings?.signatory
          ? {
              name: settings.signatory.name,
              email: settings.signatory.email ?? '',
            }
          : null;
  const companyIsSigner =
    !!companySigner &&
    signers.some(
      (s) => s.email.trim().toLowerCase() === companySigner.email.toLowerCase(),
    );
  const typeConfidential = !!settings?.types[category]?.confidential;
  const isConfidential = confidential ?? typeConfidential;

  const fields = useMemo(() => templateFields(title, body), [title, body]);

  const payload = () => ({
    companyId,
    templateId: templateId?.startsWith('starter:') ? null : templateId,
    title,
    body,
    category,
    ordered,
    signers: signers.map((s) => ({
      name: s.name,
      email: s.email,
      role: s.role || null,
      order: s.order,
    })),
    values,
    message,
    companySigner: companyChoice === 'rules' ? null : companyChoice,
    companyFirst: ordered && companyFirst,
    confidential: confidential,
    expiresOn: expiresOn || null,
    ccEmails: cc
      .split(/[,\s]+/)
      .map((e) => e.trim())
      .filter(Boolean),
  });

  const missing = fields.filter((f) => !values[f]?.trim());
  const signersOk = signers.every(
    (s) => s.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email.trim()),
  );

  const showPreview = async () => {
    setBusy(true);
    try {
      const res = await PortalSdk.postData(
        '/api/agreements/preview',
        payload(),
      );
      setPreview({ title: res.data.title, body: res.data.body });
      setStep('preview');
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    setBusy(true);
    try {
      const res = await PortalSdk.postData('/api/agreements', payload());
      const errors: Array<{ email: string; error: string }> =
        res?.data?.emailErrors ?? [];
      if (errors.length)
        toast.warning(
          `Sent, but the email to ${errors.map((e) => e.email).join(', ')} did not go out: ${errors[0].error} Copy their link from the agreement instead.`,
        );
      else toast.success('Sent. Signers have their links by email.');
      onSent();
      onOpenChange(false);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const setSigner = (i: number, patch: Partial<SignerRow>) =>
    setSigners((all) => all.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const total = signers.length + (companySigner && !companyIsSigner ? 1 : 0);

  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      title={
        step === 'pick'
          ? 'Send an agreement'
          : step === 'preview'
            ? 'Check and send'
            : 'Who signs, and the details'
      }
      description={
        step === 'pick'
          ? 'Start from one of your templates or a starter draft.'
          : step === 'preview'
            ? 'This is exactly what the signers will read.'
            : undefined
      }
      icon="signature"
      size="lg"
      footer={
        step === 'pick' ? null : step === 'write' ? (
          <>
            <AdminButton tone="ghost" size="sm" onClick={() => setStep('pick')}>
              Back
            </AdminButton>
            <AdminButton
              tone="primary"
              size="sm"
              icon="visibility"
              loading={busy}
              disabled={
                !title.trim() ||
                !body.trim() ||
                !signersOk ||
                missing.length > 0
              }
              onClick={showPreview}
            >
              Preview
            </AdminButton>
          </>
        ) : (
          <>
            <AdminButton
              tone="ghost"
              size="sm"
              onClick={() => setStep('write')}
            >
              Back
            </AdminButton>
            <AdminButton
              tone="primary"
              size="sm"
              icon="send"
              loading={busy}
              onClick={send}
            >
              Send to {total} {total === 1 ? 'person' : 'people'}
            </AdminButton>
          </>
        )
      }
    >
      {step === 'pick' && (
        <div className="flex flex-col gap-5">
          {[
            ...(preferred.length
              ? [
                  {
                    label: `For ${prefill?.to?.name ?? 'them'}`,
                    list: preferred,
                  },
                ]
              : []),
            { label: 'Your templates', list: own },
            { label: 'Starter drafts', list: starters },
          ]
            .filter((g) => g.list.length)
            .map((g) => (
              <div key={g.label} className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {g.label}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {g.list.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => pick(t)}
                      className="flex flex-col gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-left transition-colors hover:border-white/20 hover:bg-white/[0.05]"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-white">
                        <Icon
                          name="description"
                          className="text-[16px] text-neutral-400"
                        />
                        {t.name}
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500">
                        <Pill>{CATEGORY_LABEL[t.category]}</Pill>
                        {t.fields.length
                          ? `${t.fields.length} blanks to fill`
                          : 'No blanks'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          <p className="text-xs text-neutral-500">
            Starter drafts are not legal advice. Have them checked before the
            first real use, then save your own wording under Templates.
          </p>
        </div>
      )}

      {step === 'write' && (
        <div className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <Field label="Title" required>
              <TextInput
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field label="Kind">
              <NativeSelect
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as AGREEMENT_CATEGORY)
                }
              >
                {AGREEMENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {docTypeLabel(c)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Who signs
            </p>
            <ToggleSwitch
              checked={ordered}
              onChange={setOrdered}
              label="Sign in order"
              description="Each person gets it once the one before has signed. Same number signs together."
            />
            {signers.map((s, i) => (
              <div
                key={i}
                className="grid items-start gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5 sm:grid-cols-[auto_1fr_1fr_160px_auto]"
              >
                <span className="flex h-10 w-8 items-center justify-center text-xs font-semibold text-neutral-500">
                  {ordered ? (
                    <input
                      aria-label="Order"
                      type="number"
                      min={1}
                      max={10}
                      value={s.order}
                      onChange={(e) =>
                        setSigner(i, { order: Number(e.target.value) || 1 })
                      }
                      className="size-10 rounded-lg border border-white/10 bg-neutral-900 text-center text-neutral-200"
                    />
                  ) : (
                    i + 1
                  )}
                </span>
                <TextInput
                  placeholder="Full legal name"
                  value={s.name}
                  onChange={(e) => setSigner(i, { name: e.target.value })}
                />
                <TextInput
                  placeholder="Email"
                  type="email"
                  value={s.email}
                  onChange={(e) => setSigner(i, { email: e.target.value })}
                />
                <TextInput
                  placeholder="Signs as, e.g. Client"
                  value={s.role}
                  onChange={(e) => setSigner(i, { role: e.target.value })}
                />
                <IconAction
                  icon="close"
                  label="Remove"
                  disabled={signers.length === 1}
                  onClick={() =>
                    setSigners((all) => all.filter((_, j) => j !== i))
                  }
                />
              </div>
            ))}
            {signers.length < 10 && (
              <AdminButton
                size="sm"
                tone="ghost"
                icon="person_add"
                className="self-start"
                onClick={() =>
                  setSigners((all) => [...all, blankSigner(all.length + 1)])
                }
              >
                Add a signer
              </AdminButton>
            )}
            <p className="text-xs text-neutral-500">
              Each person signs by typing their name exactly as written here.
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <div className="grid items-start gap-3 sm:grid-cols-[1fr_250px]">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-white">
                  <Icon
                    name="approval"
                    className="text-[16px] text-violet-300"
                  />
                  Signs for {companyName}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {companySigner
                    ? companyIsSigner
                      ? `${companySigner.name} is already a signer above, and signs for the company.`
                      : `${companySigner.name} gets it too, and approves it with their saved signature.`
                    : 'Nobody signs for the company on this one.'}
                </p>
              </div>
              <NativeSelect
                aria-label="Who signs for the company"
                value={companyChoice}
                onChange={(e) =>
                  setCompanyChoice(e.target.value as CompanyChoice)
                }
              >
                <option value="rules">
                  {`By the rules: ${signerRuleLabel(
                    settings?.types[category]?.signer ?? 'owner',
                    'agreements',
                  )}`}
                </option>
                <option value="owner">
                  {`The owner${settings?.signatory ? `: ${settings.signatory.name}` : ''}`}
                </option>
                <option value="lead">{`Me${user?.name ? `: ${user.name}` : ''}`}</option>
                <option value="none">Nobody</option>
              </NativeSelect>
            </div>
            {ordered && companySigner && !companyIsSigner && (
              <ToggleSwitch
                checked={companyFirst}
                onChange={setCompanyFirst}
                label="The company signs first"
                description="Otherwise it signs after everyone else."
              />
            )}
            <ToggleSwitch
              checked={isConfidential}
              onChange={setConfidential}
              label="Confidential"
              description={
                isConfidential
                  ? 'Only HR, owners and the signers see it. For pay letters and anything with pay in it.'
                  : 'Everyone who can see agreements sees it.'
              }
            />
          </div>

          {fields.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                Fill in the blanks
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map((key) => (
                  <Field key={key} label={fieldLabel(key)} required>
                    <TextInput
                      value={values[key] ?? ''}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [key]: e.target.value }))
                      }
                    />
                  </Field>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setEditText((v) => !v)}
              className="flex items-center gap-1.5 self-start text-xs font-medium text-neutral-400 hover:text-white"
            >
              <Icon
                name={editText ? 'expand_less' : 'edit_note'}
                className="text-[16px]"
              />
              {editText ? 'Hide the text' : 'Edit the text for this one'}
            </button>
            {editText && (
              <TextArea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-[320px] font-mono text-[13px]"
              />
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Note to the signers"
              hint="In the email and on the signing page."
            >
              <TextArea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </Field>
            <div className="flex flex-col gap-3">
              <Field
                label="Sign by"
                hint="Optional. It expires after this day."
              >
                <DateInput
                  value={expiresOn}
                  onChange={(e) => setExpiresOn(e.target.value)}
                />
              </Field>
              <Field
                label="Copy the signed agreement to"
                hint="Emails, separated by commas."
              >
                <TextInput value={cc} onChange={(e) => setCc(e.target.value)} />
              </Field>
            </div>
          </div>
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {companySigner && !companyIsSigner && ordered && companyFirst && (
              <Pill tone="purple" icon="approval">
                {companySigner.name} · for {companyName}
              </Pill>
            )}
            {signers
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((s, i) => {
                const forCompany =
                  companyIsSigner &&
                  s.email.trim().toLowerCase() ===
                    companySigner!.email.toLowerCase();
                return (
                  <Pill
                    key={i}
                    icon={forCompany ? 'approval' : 'draw'}
                    tone={forCompany ? 'purple' : undefined}
                  >
                    {ordered ? `${s.order}. ` : ''}
                    {s.name}
                    {forCompany
                      ? ` · for ${companyName}`
                      : s.role
                        ? ` · ${s.role}`
                        : ''}
                  </Pill>
                );
              })}
            {companySigner &&
              !companyIsSigner &&
              !(ordered && companyFirst) && (
                <Pill tone="purple" icon="approval">
                  {companySigner.name} · for {companyName}
                </Pill>
              )}
            {isConfidential && (
              <Pill tone="warning" icon="lock">
                Confidential
              </Pill>
            )}
          </div>
          <Paper title={preview.title} body={preview.body} />
        </div>
      )}
    </AdminModal>
  );
};

/* ------------------------------ detail dialog ---------------------------- */

const DetailDialog = ({
  id,
  onClose,
  onChanged,
  canEdit,
  canDelete,
}: {
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
  canEdit: boolean;
  canDelete: boolean;
}) => {
  const [detail, setDetail] = useState<AgreementDetail | null>(null);
  const [tab, setTab] = useState<'people' | 'document' | 'trail'>('people');
  const [busy, setBusy] = useState<string | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return setDetail(null);
    setTab('people');
    PortalSdk.getData(`/api/agreements/${id}`, null)
      .then((res) => setDetail(res.data.agreement))
      .catch((err) => {
        toast.error(errorText(err));
        onClose();
      });
  }, [id, onClose]);

  const act = async (key: string, data: Record<string, unknown>) => {
    if (!detail) return;
    setBusy(key);
    try {
      const res = await PortalSdk.putData(`/api/agreements/${detail.id}`, data);
      setDetail(res.data.agreement);
      const errors: Array<{ email: string; error: string }> =
        res?.data?.emailErrors ?? [];
      if (errors.length) toast.warning(`Not sent: ${errors[0].error}`);
      else
        toast.success(data.action === 'void' ? 'Withdrawn' : 'Reminder sent');
      onChanged();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!detail) return;
    setBusy('delete');
    try {
      await PortalSdk.deleteData(`/api/agreements/${detail.id}`, null);
      toast.success('Deleted');
      setDeleting(false);
      onChanged();
      onClose();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const open = detail?.status === AGREEMENT_STATUS.SENT;
  const meta = detail ? STATUS_META[detail.status] : null;

  return (
    <>
      <AdminModal
        open={!!id}
        onOpenChange={(o) => !o && onClose()}
        title={detail?.title ?? 'Loading…'}
        description={
          detail
            ? `${detail.typeLabel}${detail.confidential ? ' · confidential' : ''} · sent by ${detail.sender.name} on ${day(detail.sentAt)}`
            : undefined
        }
        icon="signature"
        size="lg"
        footer={
          detail && (
            <>
              {canDelete &&
                !open &&
                detail.status !== AGREEMENT_STATUS.COMPLETED && (
                  <AdminButton
                    size="sm"
                    tone="ghost"
                    icon="delete"
                    onClick={() => setDeleting(true)}
                  >
                    Delete
                  </AdminButton>
                )}
              <div className="flex-1" />
              {detail.pdfUrl && (
                <a
                  href={detail.pdfUrl}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-neutral-100 hover:bg-white/[0.09]"
                >
                  <Icon name="download" className="text-[16px]" />
                  Signed PDF
                </a>
              )}
              {open && canEdit && (
                <>
                  <AdminButton
                    size="sm"
                    tone="danger"
                    icon="cancel"
                    onClick={() => setVoiding(true)}
                  >
                    Withdraw
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    tone="primary"
                    icon="notifications_active"
                    loading={busy === 'remind'}
                    onClick={() => act('remind', { action: 'remind' })}
                  >
                    Remind
                  </AdminButton>
                </>
              )}
            </>
          )
        }
      >
        {!detail ? (
          <SkeletonRows rows={3} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {meta && (
                <Pill tone={meta.tone} icon={meta.icon}>
                  {meta.label}
                </Pill>
              )}
              {detail.confidential && (
                <Pill tone="warning" icon="lock">
                  HR and owners
                </Pill>
              )}
              <span className="text-xs text-neutral-500">
                {detail.progress.signed} of {detail.progress.total} signed
                {detail.completedAt
                  ? ` · completed ${when(detail.completedAt)}`
                  : ''}
                {detail.expiresOn && open
                  ? ` · sign by ${day(detail.expiresOn)}`
                  : ''}
              </span>
              <div className="flex-1" />
              <Segmented
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'people', label: 'Signers', icon: 'group' },
                  { value: 'document', label: 'Document', icon: 'description' },
                  { value: 'trail', label: 'Audit trail', icon: 'history' },
                ]}
              />
            </div>

            {detail.voidReason && (
              <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-xs text-neutral-400">
                Withdrawn: {detail.voidReason}
              </p>
            )}

            {tab === 'people' && (
              <ul className="flex flex-col gap-2">
                {detail.signers.map((s) => {
                  const sig = detail.signatures.find(
                    (x) => x.signerId === s.id,
                  );
                  const up =
                    open &&
                    (s.status === SIGNER_STATUS.PENDING ||
                      s.status === SIGNER_STATUS.VIEWED);
                  return (
                    <li
                      key={s.id}
                      className="flex flex-col gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-white">
                          {detail.ordered && (
                            <span className="text-xs text-neutral-500">
                              {s.order}.
                            </span>
                          )}
                          {s.name}
                          {s.company && (
                            <Pill tone="purple" icon="approval">
                              For the company
                            </Pill>
                          )}
                          <Pill tone={SIGNER_META[s.status].tone}>
                            {SIGNER_META[s.status].label}
                          </Pill>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-neutral-500">
                          {s.email}
                          {s.role ? ` · ${s.role}` : ''}
                          {s.signedAt
                            ? ` · signed ${when(s.signedAt)}`
                            : s.viewedAt
                              ? ` · opened ${when(s.viewedAt)}`
                              : s.notifiedAt
                                ? ` · sent ${when(s.notifiedAt)}`
                                : ''}
                          {s.remindedAt
                            ? ` · reminded ${when(s.remindedAt)}`
                            : ''}
                        </p>
                        {s.declineReason && (
                          <p className="mt-1 text-xs text-rose-300">
                            “{s.declineReason}”
                          </p>
                        )}
                        {sig && (
                          <p className="mt-1 text-[11px] text-neutral-600">
                            {sig.saved
                              ? 'Approved with their saved signature'
                              : `${sig.method === 'drawn' ? 'Drawn' : 'Typed'} signature`}
                            {sig.ip ? ` from ${sig.ip}` : ''}
                          </p>
                        )}
                      </div>
                      {sig?.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sig.image}
                          alt={`Signature of ${sig.name}`}
                          className="h-10 rounded bg-white px-2"
                        />
                      )}
                      <div className="flex items-center gap-1">
                        {up && canEdit && (
                          <IconAction
                            icon="notifications_active"
                            label="Remind them"
                            loading={busy === s.id}
                            onClick={() =>
                              act(s.id, { action: 'remind', signerId: s.id })
                            }
                          />
                        )}
                        {s.signUrl &&
                          (up ||
                            detail.status === AGREEMENT_STATUS.COMPLETED) && (
                            <CopyButton
                              value={s.signUrl}
                              label="Copy their link"
                            />
                          )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {tab === 'document' && (
              <div className="flex flex-col gap-2">
                <Paper body={detail.body} />
                <p
                  className={cn(
                    'flex items-center gap-1.5 break-all font-mono text-[11px]',
                    detail.hashOk ? 'text-neutral-500' : 'text-rose-300',
                  )}
                >
                  <Icon
                    name={detail.hashOk ? 'verified' : 'error'}
                    className="text-[14px]"
                  />
                  SHA-256 {detail.hash}
                  {detail.hashOk ? '' : ' (does not match the text)'}
                </p>
              </div>
            )}

            {tab === 'trail' && (
              <ol className="flex flex-col gap-2">
                {detail.history.map((e, i) => (
                  <li
                    key={i}
                    className="flex flex-col gap-0.5 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 sm:flex-row sm:gap-4"
                  >
                    <span className="w-40 shrink-0 text-xs text-neutral-500">
                      {when(e.at)}
                    </span>
                    <span className="text-sm text-neutral-200">
                      {e.text}
                      {e.ip && (
                        <span className="block text-[11px] text-neutral-600">
                          {e.ip}
                          {e.userAgent ? ` · ${e.userAgent.slice(0, 90)}` : ''}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </AdminModal>

      <AdminModal
        open={voiding}
        onOpenChange={setVoiding}
        title="Withdraw this agreement?"
        description="Nobody can sign it after this. People who were sent it get an email."
        icon="cancel"
        size="sm"
        footer={
          <>
            <AdminButton
              size="sm"
              tone="ghost"
              onClick={() => setVoiding(false)}
            >
              Keep it
            </AdminButton>
            <AdminButton
              size="sm"
              tone="danger"
              loading={busy === 'void'}
              onClick={async () => {
                await act('void', { action: 'void', reason: voidReason });
                setVoiding(false);
                setVoidReason('');
              }}
            >
              Withdraw
            </AdminButton>
          </>
        }
      >
        <Field label="Why (in the email)">
          <TextArea
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            rows={3}
          />
        </Field>
      </AdminModal>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete this agreement?"
        message="It and its audit trail are removed for good."
        loading={busy === 'delete'}
        onConfirm={remove}
      />
    </>
  );
};

/* -------------------------------- templates ------------------------------ */

const TemplatesView = ({
  companyId,
  templates,
  canEdit,
  onChanged,
}: {
  companyId: string;
  templates: TemplateView[];
  canEdit: boolean;
  onChanged: () => void;
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    id: string | null;
    name: string;
    category: AGREEMENT_CATEGORY;
    title: string;
    body: string;
    roles: string;
  } | null>(null);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const active =
    templates.find((t) => t.id === activeId) ?? templates[0] ?? null;

  useEffect(() => {
    if (!active) return setDraft(null);
    setDraft({
      id: active.builtIn ? null : active.id,
      name: active.builtIn ? `${active.name} (ours)` : active.name,
      category: active.category,
      title: active.title,
      body: active.body,
      roles: active.signerRoles.join(', '),
    });
    setMode('edit');
  }, [active]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await PortalSdk.putData('/api/agreements/templates', {
        companyId,
        id: draft.id,
        name: draft.name,
        category: draft.category,
        title: draft.title,
        body: draft.body,
        signerRoles: draft.roles
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean),
      });
      toast.success('Template saved');
      setActiveId(res.data.template.id);
      onChanged();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft?.id) return;
    setSaving(true);
    try {
      await PortalSdk.deleteData(
        `/api/agreements/templates?companyId=${companyId}&id=${draft.id}`,
        null,
      );
      toast.success('Template deleted');
      setDeleting(false);
      setActiveId(null);
      onChanged();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const sample = useMemo(() => {
    if (!draft) return '';
    const vars: Record<string, string> = {
      companyName: 'Your company',
      today: day(new Date().toISOString()),
      signer1Name: 'Asha Verma',
      signer1Email: 'asha@example.com',
      signer2Name: 'Ravi Kumar',
      signer2Email: 'ravi@example.com',
    };
    return draft.body.replace(
      /\{\{\s*(\w+)\s*\}\}/g,
      (_, k: string) => vars[k] ?? `[${fieldLabel(k)}]`,
    );
  }, [draft]);

  const newTemplate = () => {
    setActiveId(null);
    setDraft({
      id: null,
      name: 'New template',
      category: AGREEMENT_CATEGORY.OTHER,
      title: 'Agreement',
      body: '# Agreement\n\nThis agreement is made on {{today}} between **{{companyName}}** and **{{signer1Name}}**.\n\n',
      roles: '',
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="flex gap-2 overflow-x-auto lg:flex-col">
        {canEdit && (
          <AdminButton
            size="sm"
            icon="add"
            onClick={newTemplate}
            className="lg:self-start"
          >
            New template
          </AdminButton>
        )}
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveId(t.id)}
            className={cn(
              'flex min-w-[200px] flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors',
              active?.id === t.id
                ? 'border-white/20 bg-white/[0.07]'
                : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15',
            )}
          >
            <span className="truncate text-sm font-medium text-white">
              {t.name}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-neutral-500">
              <Pill tone={t.builtIn ? 'neutral' : 'info'}>
                {t.builtIn ? 'Starter draft' : 'Yours'}
              </Pill>
              {CATEGORY_LABEL[t.category]}
            </span>
          </button>
        ))}
      </div>

      {draft && (
        <Panel className="flex min-w-0 flex-col">
          <div className="grid gap-3 border-b border-white/[0.07] p-4 sm:grid-cols-2">
            <Field label="Template name">
              <TextInput
                value={draft.name}
                disabled={!canEdit}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <Field label="Kind">
              <NativeSelect
                value={draft.category}
                disabled={!canEdit}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    category: e.target.value as AGREEMENT_CATEGORY,
                  })
                }
              >
                {AGREEMENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Title it goes out with">
              <TextInput
                value={draft.title}
                disabled={!canEdit}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </Field>
            <Field
              label="Who signs"
              hint="Roles in order, separated by commas."
            >
              <TextInput
                value={draft.roles}
                disabled={!canEdit}
                placeholder="Client, For the company"
                onChange={(e) => setDraft({ ...draft, roles: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: 'edit', label: 'Edit', icon: 'edit' },
                { value: 'preview', label: 'Preview', icon: 'visibility' },
              ]}
            />
            <div className="flex-1" />
            <span className="text-[11px] text-neutral-500">
              Filled by the portal:{' '}
              {AUTO_PLACEHOLDERS.slice(0, 5)
                .map((p) => `{{${p.key}}}`)
                .join(' ')}
              … Any other {'{{word}}'} is a blank to fill when sending.
            </span>
          </div>
          {mode === 'edit' ? (
            <div className="p-4">
              <textarea
                value={draft.body}
                readOnly={!canEdit}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                spellCheck
                className="custom-scrollbar min-h-[460px] w-full resize-y rounded-lg border border-white/10 bg-neutral-900/80 p-4 font-mono text-[13px] leading-relaxed text-neutral-200 focus:border-white/25 focus:outline-none"
              />
            </div>
          ) : (
            <div className="custom-scrollbar max-h-[640px] overflow-y-auto bg-neutral-800/30 p-4">
              <Paper body={sample} />
              <p className="mt-3 text-center text-[11px] text-neutral-500">
                Blanks show in brackets; the rest is sample values.
              </p>
            </div>
          )}
          {canEdit && (
            <div className="flex items-center justify-end gap-2 border-t border-white/[0.07] px-4 py-3">
              {draft.id && (
                <AdminButton
                  size="sm"
                  tone="ghost"
                  icon="delete"
                  disabled={saving}
                  onClick={() => setDeleting(true)}
                >
                  Delete
                </AdminButton>
              )}
              <AdminButton
                size="sm"
                tone="primary"
                icon="save"
                loading={saving}
                disabled={
                  !draft.name.trim() ||
                  !draft.title.trim() ||
                  !draft.body.trim()
                }
                onClick={save}
              >
                {draft.id ? 'Save' : 'Save as your template'}
              </AdminButton>
            </div>
          )}
        </Panel>
      )}

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete this template?"
        message="Agreements already sent from it keep their text."
        loading={saving}
        onConfirm={remove}
      />
    </div>
  );
};

/* ---------------------------------- tab ---------------------------------- */

type View = 'documents' | 'people' | 'templates' | 'rules';

export const AdminAgreements = ({
  selectedCompanyId,
  onSelectCompany,
}: {
  selectedCompanyId: string | null;
  onSelectCompany: (companyId: string) => void;
}) => {
  const { workCompanies: companies, can } = useWorkspace();
  const readable = companies.filter((c) =>
    can(c.company.id, 'agreements:read'),
  );
  const companyId = readable.some((c) => c.company.id === selectedCompanyId)
    ? selectedCompanyId
    : (readable[0]?.company.id ?? null);
  const companyName =
    readable.find((c) => c.company.id === companyId)?.company.name ??
    'the company';

  const [view, setView] = useState<View>('documents');
  const [templates, setTemplates] = useState<TemplateView[]>([]);
  const [settings, setSettings] = useState<SettingsView | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sending, setSending] = useState<SendPrefill | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    try {
      const [t, r] = await Promise.all([
        PortalSdk.getData(
          `/api/agreements/templates?companyId=${companyId}`,
          null,
        ),
        PortalSdk.getData(
          `/api/agreements/settings?companyId=${companyId}`,
          null,
        ),
      ]);
      setTemplates(t?.data?.templates ?? []);
      setSettings(r?.data?.settings ?? null);
    } catch (err) {
      toast.error(errorText(err));
    }
  }, [companyId]);

  useEffect(() => {
    setSettings(null);
    load();
  }, [load]);

  const changed = useCallback(() => {
    setRefreshKey((k) => k + 1);
    load();
  }, [load]);

  // Opened from an email or a link: ?agreement=<id>, or ?view=rules.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('agreement');
    if (id && /^[a-f0-9]{24}$/i.test(id)) setOpenId(id);
    const v = params.get('view');
    if (v === 'people' || v === 'templates' || v === 'rules') setView(v);
  }, []);

  const closeDetail = useCallback(() => setOpenId(null), []);

  const openRow = useCallback((row: VaultRow) => {
    if (row.source === 'onboarding') {
      if (row.link) window.location.href = row.link;
      return;
    }
    setOpenId(row.id);
  }, []);

  if (!companyId)
    return (
      <NeedsCompany text="Agreements are sent by company owners, HR and managers." />
    );

  const canCreate = can(companyId, 'agreements:create');
  const canEdit = can(companyId, 'agreements:edit');
  const canDelete = can(companyId, 'agreements:delete');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <CompanyPicker
          companies={readable}
          value={companyId}
          onChange={onSelectCompany}
        />
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'documents', label: 'Documents', icon: 'folder_open' },
            { value: 'people', label: 'People', icon: 'folder_shared' },
            { value: 'templates', label: 'Templates', icon: 'description' },
            { value: 'rules', label: 'Signing rules', icon: 'approval' },
          ]}
        />
        <div className="flex-1" />
        {canCreate && (
          <AdminButton
            tone="primary"
            icon="send"
            disabled={!templates.length}
            onClick={() => setSending({})}
          >
            Send an agreement
          </AdminButton>
        )}
      </div>

      {view === 'templates' ? (
        <TemplatesView
          companyId={companyId}
          templates={templates}
          canEdit={canEdit}
          onChanged={load}
        />
      ) : view === 'rules' ? (
        <SigningRulesView
          companyId={companyId}
          settings={settings}
          canEdit={canEdit}
          onSaved={setSettings}
        />
      ) : view === 'people' ? (
        <PeopleView
          companyId={companyId}
          refreshKey={refreshKey}
          onOpen={openRow}
          canCreate={canCreate}
          onSend={(to, category) => setSending({ to, category })}
        />
      ) : (
        <VaultView
          companyId={companyId}
          refreshKey={refreshKey}
          onOpen={openRow}
          canCreate={canCreate}
          onSend={() => setSending({})}
        />
      )}

      <SendDialog
        open={!!sending}
        onOpenChange={(o) => !o && setSending(null)}
        companyId={companyId}
        companyName={companyName}
        templates={templates}
        settings={settings}
        prefill={sending}
        onSent={changed}
      />
      <DetailDialog
        id={openId}
        onClose={closeDetail}
        onChanged={changed}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
};
