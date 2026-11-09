'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type {
  AgreementDetail,
  AgreementView,
  TemplateView,
} from '@/lib/agreements/server';
import {
  AGREEMENT_CATEGORIES,
  AUTO_PLACEHOLDERS,
  CATEGORY_LABEL,
  fieldLabel,
  templateFields,
} from '@/lib/agreements/templates';
import { cn } from '@/lib/utils';
import {
  AGREEMENT_CATEGORY,
  AGREEMENT_STATUS,
  SIGNER_STATUS,
} from '@/models/agreements';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { Paper } from '../Onboarding/OnboardingDialogs';
import {
  AdminButton,
  AdminModal,
  ConfirmDialog,
  CopyButton,
  DateInput,
  EmptyState,
  Field,
  Icon,
  IconAction,
  NativeSelect,
  Panel,
  Pill,
  type PillTone,
  SearchInput,
  Segmented,
  SkeletonRows,
  TextArea,
  TextInput,
  ToggleSwitch,
} from '../shared/AdminUI';
import { CompanyPicker, errorText, NeedsCompany } from '../Workspace/shared';

/*
 * Admin > Agreements: send any agreement to sign (an NDA, a contractor or
 * client agreement, a policy), follow who has signed, and keep the signed
 * copy with its audit trail. Onboarding documents show here read-only.
 */

const STATUS_META: Record<
  AGREEMENT_STATUS,
  { label: string; tone: PillTone; icon: string }
> = {
  [AGREEMENT_STATUS.SENT]: {
    label: 'Out for signing',
    tone: 'warning',
    icon: 'pending',
  },
  [AGREEMENT_STATUS.COMPLETED]: {
    label: 'Signed',
    tone: 'positive',
    icon: 'task_alt',
  },
  [AGREEMENT_STATUS.DECLINED]: {
    label: 'Declined',
    tone: 'danger',
    icon: 'block',
  },
  [AGREEMENT_STATUS.VOIDED]: {
    label: 'Withdrawn',
    tone: 'neutral',
    icon: 'cancel',
  },
  [AGREEMENT_STATUS.EXPIRED]: {
    label: 'Expired',
    tone: 'neutral',
    icon: 'timer_off',
  },
};

const SIGNER_META: Record<SIGNER_STATUS, { label: string; tone: PillTone }> = {
  [SIGNER_STATUS.WAITING]: { label: 'Signs later', tone: 'neutral' },
  [SIGNER_STATUS.PENDING]: { label: 'Sent', tone: 'info' },
  [SIGNER_STATUS.VIEWED]: { label: 'Opened', tone: 'purple' },
  [SIGNER_STATUS.SIGNED]: { label: 'Signed', tone: 'positive' },
  [SIGNER_STATUS.DECLINED]: { label: 'Declined', tone: 'danger' },
};

const when = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';

const day = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

type Filter = 'all' | 'open' | 'signed' | 'closed';

/* ------------------------------ send dialog ------------------------------ */

type SignerRow = { name: string; email: string; role: string; order: number };

const blankSigner = (order: number, role = ''): SignerRow => ({
  name: '',
  email: '',
  role,
  order,
});

const SendDialog = ({
  open,
  onOpenChange,
  companyId,
  templates,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  templates: TemplateView[];
  onSent: () => void;
}) => {
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
  }, [open]);

  const pick = (t: TemplateView) => {
    setTemplateId(t.id);
    setTitle(t.title);
    setBody(t.body);
    setCategory(t.category);
    setSigners(
      t.signerRoles.length
        ? t.signerRoles.map((r, i) => blankSigner(i + 1, r))
        : [blankSigner(1)],
    );
    setStep('write');
  };

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

  const own = templates.filter((t) => !t.builtIn);
  const starters = templates.filter((t) => t.builtIn);

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
              Send to {signers.length}{' '}
              {signers.length === 1 ? 'person' : 'people'}
            </AdminButton>
          </>
        )
      }
    >
      {step === 'pick' && (
        <div className="flex flex-col gap-5">
          {[
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
                    {CATEGORY_LABEL[c]}
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
              Add yourself if the company signs too.
            </p>
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
            {signers
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((s, i) => (
                <Pill key={i} icon="draw">
                  {ordered ? `${s.order}. ` : ''}
                  {s.name}
                  {s.role ? ` · ${s.role}` : ''}
                </Pill>
              ))}
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
  const firstLink = detail?.signers[0]?.signUrl;

  return (
    <>
      <AdminModal
        open={!!id}
        onOpenChange={(o) => !o && onClose()}
        title={detail?.title ?? 'Loading…'}
        description={
          detail
            ? `${CATEGORY_LABEL[detail.category]} · sent by ${detail.sender.name} on ${day(detail.sentAt)}`
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
              {detail.status === AGREEMENT_STATUS.COMPLETED && firstLink && (
                <a
                  href={firstLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-neutral-100 hover:bg-white/[0.09]"
                >
                  <Icon name="download" className="text-[16px]" />
                  Signed copy and certificate
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
                            {sig.method === 'drawn' ? 'Drawn' : 'Typed'}{' '}
                            signature
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
                        {(up ||
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

  const [view, setView] = useState<'agreements' | 'templates'>('agreements');
  const [agreements, setAgreements] = useState<AgreementView[]>([]);
  const [templates, setTemplates] = useState<TemplateView[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [a, t] = await Promise.all([
        PortalSdk.getData(`/api/agreements?companyId=${companyId}`, null),
        PortalSdk.getData(
          `/api/agreements/templates?companyId=${companyId}`,
          null,
        ),
      ]);
      setAgreements(a?.data?.agreements ?? []);
      setTemplates(t?.data?.templates ?? []);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  // Opened from an email or a link: ?agreement=<id>.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('agreement');
    if (id && /^[a-f0-9]{24}$/i.test(id)) setOpenId(id);
  }, []);

  const closeDetail = useCallback(() => setOpenId(null), []);

  if (!companyId)
    return (
      <NeedsCompany text="Agreements are sent by company owners and managers." />
    );

  const canCreate = can(companyId, 'agreements:create');
  const canEdit = can(companyId, 'agreements:edit');
  const canDelete = can(companyId, 'agreements:delete');

  const matchesFilter = (a: AgreementView, f: Filter = filter) =>
    f === 'all' ||
    (f === 'open' && a.status === AGREEMENT_STATUS.SENT) ||
    (f === 'signed' && a.status === AGREEMENT_STATUS.COMPLETED) ||
    (f === 'closed' &&
      a.status !== AGREEMENT_STATUS.SENT &&
      a.status !== AGREEMENT_STATUS.COMPLETED);
  const q = query.trim().toLowerCase();
  const shown = agreements.filter(
    (a) =>
      matchesFilter(a) &&
      (!q ||
        a.title.toLowerCase().includes(q) ||
        a.signers.some(
          (s) => s.name.toLowerCase().includes(q) || s.email.includes(q),
        )),
  );
  const count = (f: Filter) =>
    agreements.filter((a) => matchesFilter(a, f)).length;

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
            { value: 'agreements', label: 'Agreements', icon: 'signature' },
            { value: 'templates', label: 'Templates', icon: 'description' },
          ]}
        />
        <div className="flex-1" />
        {canCreate && (
          <AdminButton
            tone="primary"
            icon="send"
            disabled={!templates.length}
            onClick={() => setSending(true)}
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
      ) : (
        <Panel>
          <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] px-4 py-3">
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All', count: count('all') },
                {
                  value: 'open',
                  label: 'Out for signing',
                  count: count('open'),
                },
                { value: 'signed', label: 'Signed', count: count('signed') },
                { value: 'closed', label: 'Closed', count: count('closed') },
              ]}
            />
            <div className="flex-1" />
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Title or signer"
            />
          </div>
          {loading && !agreements.length ? (
            <SkeletonRows rows={4} />
          ) : !shown.length ? (
            <EmptyState
              icon="signature"
              title={
                agreements.length ? 'Nothing matches' : 'No agreements yet'
              }
              description={
                agreements.length
                  ? undefined
                  : 'Send an NDA, a contractor or client agreement, or any document that needs a signature. Each person signs from their own link, no account needed.'
              }
              action={
                !agreements.length && canCreate ? (
                  <AdminButton
                    size="sm"
                    icon="send"
                    onClick={() => setSending(true)}
                  >
                    Send the first one
                  </AdminButton>
                ) : undefined
              }
            />
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {shown.map((a) => {
                const meta = STATUS_META[a.status];
                const row = (
                  <>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-[18px] text-neutral-400">
                      <Icon
                        name={
                          a.source === 'onboarding'
                            ? 'how_to_reg'
                            : 'description'
                        }
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {a.title}
                      </p>
                      <p className="truncate text-xs text-neutral-500">
                        {a.signers.map((s) => s.name).join(', ')} · sent{' '}
                        {day(a.sentAt)}
                        {a.source === 'onboarding' ? ' · from onboarding' : ''}
                      </p>
                    </div>
                    <Pill className="hidden sm:inline-flex">
                      {CATEGORY_LABEL[a.category]}
                    </Pill>
                    <span className="hidden w-20 text-right text-xs text-neutral-500 sm:block">
                      {a.progress.signed}/{a.progress.total} signed
                    </span>
                    <Pill tone={meta.tone} icon={meta.icon}>
                      {meta.label}
                    </Pill>
                  </>
                );
                return (
                  <li key={a.id}>
                    {a.source === 'onboarding' && a.link ? (
                      <a
                        href={a.link}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                      >
                        {row}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOpenId(a.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                      >
                        {row}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      )}

      <SendDialog
        open={sending}
        onOpenChange={setSending}
        companyId={companyId}
        templates={templates}
        onSent={load}
      />
      <DetailDialog
        id={openId}
        onClose={closeDetail}
        onChanged={load}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
};
