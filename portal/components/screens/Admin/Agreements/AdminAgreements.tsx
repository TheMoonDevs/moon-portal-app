'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { docTypeLabel, signerRuleLabel } from '@/lib/agreements/docTypes';
import type {
  AgreementDetail,
  TemplateVersionView,
  TemplateView,
} from '@/lib/agreements/server';
import type { SettingsView } from '@/lib/agreements/signers';
import {
  AGREEMENT_CATEGORIES,
  AUTO_PLACEHOLDERS,
  CATEGORY_LABEL,
  fieldLabel,
  isPersonKey,
  templateFields,
} from '@/lib/agreements/templates';
import type { VaultRow } from '@/lib/agreements/vault';
import { cn } from '@/lib/utils';
import {
  AGREEMENT_CATEGORY,
  AGREEMENT_STATUS,
  type AgreementField,
  type AgreementLinkKind,
  type CompanySignerRule,
  SIGNER_STATUS,
} from '@/models/agreements';
import {
  fetchPdf,
  openPdf,
  pdfText,
  wordToText,
} from '@/utils/helpers/pdfClient';
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
import { type FieldDraft, FieldsEditor, toDrafts } from './FieldsEditor';
import { ImportDialog } from './ImportDialog';
import { LettersView } from './LettersView';
import { day, SIGNER_META, STATUS_META, when } from './meta';
import { OverviewView } from './OverviewView';
import { PeopleView } from './PeopleView';
import {
  type BoxDraft,
  BoxesPreview,
  type BoxRecipient,
  PlaceBoxes,
} from './PlaceBoxes';
import { PoliciesView } from './PoliciesView';
import { RequiredDocsView } from './RequiredDocsView';
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
  /** A renewal, amendment or fresh copy of an agreement, linked to it. */
  from?: {
    previousId: string;
    linkKind: AgreementLinkKind;
    previousTitle: string;
    title: string;
    body: string;
    category: AGREEMENT_CATEGORY;
    templateId: string | null;
    ordered: boolean;
    confidential: boolean;
    signers: SignerRow[];
    fields: AgreementField[];
    /** An uploaded PDF: the same file, with the same boxes. */
    upload?: {
      key: string;
      fileName: string;
      size: number;
      hash: string;
      pages: Array<{ w: number; h: number }>;
      url: string;
      boxes: BoxDraft[];
    } | null;
  };
};

const LINK_LABEL: Record<AgreementLinkKind, string> = {
  renewal: 'Renews',
  amendment: 'Amends',
  resend: 'Sent again from',
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_PDF_MB = 20;

/** An uploaded PDF, signed as it is. */
type Upload = {
  key: string;
  name: string;
  data: ArrayBuffer;
  document: {
    fileName: string;
    size: number;
    hash: string;
    pages: Array<{ w: number; h: number }>;
  };
};

export const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const titleFromFile = (name: string) =>
  name
    .replace(/\.(pdf|docx?)$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** signer2Address → 2 and Address. */
const personBlank = (key: string) => {
  const m = /^signer(\d+)(\w+)$/.exec(key);
  return m ? { n: Number(m[1]), fact: m[2] } : null;
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
  const [step, setStep] = useState<'pick' | 'write' | 'place' | 'preview'>(
    'pick',
  );
  const [upload, setUpload] = useState<Upload | null>(null);
  const [boxes, setBoxes] = useState<BoxDraft[]>([]);
  const [emailCode, setEmailCode] = useState(false);
  const [reading, setReading] = useState<'pdf' | 'word' | null>(null);
  const [readingText, setReadingText] = useState('');
  const pdfInput = useRef<HTMLInputElement>(null);
  const wordInput = useRef<HTMLInputElement>(null);
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
  const [fieldDrafts, setFieldDrafts] = useState<FieldDraft[]>([]);
  const [endsOn, setEndsOn] = useState('');
  const [blocking, setBlocking] = useState(false);
  // What the Portal knows about each signer, by email, for blanks about them.
  const [facts, setFacts] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const [preview, setPreview] = useState<{
    title: string;
    body: string;
    filled: string[];
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const from = prefill?.from;
    setStep(from ? 'write' : 'pick');
    setTemplateId(from?.templateId ?? null);
    setUpload(null);
    setBoxes([]);
    setEmailCode(false);
    setPreview(null);
    setEditText(false);
    setValues({});
    setMessage('');
    setExpiresOn('');
    setEndsOn('');
    setBlocking(false);
    setCc('');
    setOrdered(from?.ordered ?? false);
    setCompanyChoice('rules');
    setCompanyFirst(false);
    setConfidential(from ? from.confidential : null);
    setFieldDrafts(toDrafts(from?.fields));
    if (from) {
      setTitle(from.title);
      setBody(from.body);
      setCategory(from.category);
      setSigners(from.signers.length ? from.signers : [blankSigner(1)]);
      // An amendment usually changes the words: open the text.
      setEditText(from.linkKind === 'amendment' && !from.upload);
      const again = from.upload;
      if (again) {
        // The same file again, read back to draw its pages.
        setBoxes(again.boxes);
        fetchPdf(again.url)
          .then((data) =>
            setUpload({
              key: again.key,
              name: again.fileName,
              data,
              document: {
                fileName: again.fileName,
                size: again.size,
                hash: again.hash,
                pages: again.pages,
              },
            }),
          )
          .catch((e) => toast.error(errorText(e)));
      }
    }
  }, [open, prefill]);

  const pick = (t: TemplateView) => {
    setTemplateId(t.id);
    setTitle(t.title);
    setBody(t.body);
    setCategory(t.category);
    setFieldDrafts(toDrafts(t.fields));
    const rows = t.signerRoles.length
      ? t.signerRoles.map((r, i) => blankSigner(i + 1, r))
      : [blankSigner(1)];
    // Sent to someone from their file: they're the first signer.
    if (prefill?.to) rows[0] = { ...rows[0], ...prefill.to };
    setSigners(rows);
    setStep('write');
  };

  const firstSigners = () => {
    const row = blankSigner(1);
    return [prefill?.to ? { ...row, ...prefill.to } : row];
  };

  /** A PDF to sign as it is: read here, uploaded, then checked. */
  const takePdf = async (file: File) => {
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      toast.error('Upload a PDF.');
      return;
    }
    if (file.size > MAX_PDF_MB * 1024 * 1024) {
      toast.error(`PDFs can be up to ${MAX_PDF_MB} MB.`);
      return;
    }
    setReading('pdf');
    try {
      setReadingText('Reading it…');
      const data = await file.arrayBuffer();
      let text = '';
      try {
        const doc = await openPdf(data);
        text = await pdfText(doc);
        doc.destroy();
      } catch (e) {
        throw new Error(
          (e as Error)?.name === 'PasswordException'
            ? 'This PDF is password-protected. Save an unlocked copy and upload that.'
            : 'This PDF can’t be read. Try saving it again as PDF.',
        );
      }
      setReadingText('Uploading…');
      const up = await PortalSdk.postData('/api/agreements/sources', {
        companyId,
        name: file.name,
        size: file.size,
        mime: 'application/pdf',
      });
      const put = await fetch(up.data.url, {
        method: 'PUT',
        headers: up.data.headers,
        body: file,
      });
      if (!put.ok) throw new Error('The upload failed. Try again.');
      setReadingText('Checking it…');
      const res = await PortalSdk.postData('/api/agreements/sources', {
        companyId,
        check: true,
        key: up.data.key,
        name: file.name,
      });
      setUpload({
        key: up.data.key,
        name: file.name,
        data,
        document: res.data.document,
      });
      setTemplateId(null);
      setTitle(titleFromFile(file.name));
      setBody(text);
      setCategory(prefill?.category ?? AGREEMENT_CATEGORY.OTHER);
      setFieldDrafts([]);
      setSigners(firstSigners());
      setBoxes([]);
      setEditText(false);
      setStep('write');
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setReading(null);
    }
  };

  /** A Word file, turned into text to edit and send. */
  const takeWord = async (file: File) => {
    if (!/\.docx$/i.test(file.name)) {
      toast.error(
        /\.doc$/i.test(file.name)
          ? 'Save it as .docx in Word first, then upload that.'
          : 'Upload a Word file (.docx).',
      );
      return;
    }
    setReading('word');
    setReadingText('Reading it…');
    try {
      const text = await wordToText(await file.arrayBuffer());
      if (!text.trim()) throw new Error('There is no text in that file.');
      setUpload(null);
      setTemplateId(null);
      setTitle(
        /^# (.+)/.exec(text)?.[1]?.trim().slice(0, 150) ||
          titleFromFile(file.name),
      );
      setBody(text);
      setCategory(prefill?.category ?? AGREEMENT_CATEGORY.OTHER);
      setFieldDrafts([]);
      setSigners(firstSigners());
      setEditText(true);
      setStep('write');
    } catch (err) {
      toast.error(
        errorText(err) || 'This Word file can’t be read. Try saving it again.',
      );
    } finally {
      setReading(null);
    }
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

  // An uploaded PDF goes as it is: no blanks to fill in its text.
  const isUpload = !!upload || !!prefill?.from?.upload;
  const fields = useMemo(
    () => (isUpload ? [] : templateFields(title, body)),
    [title, body, isUpload],
  );
  const wantsFacts = fields.some(isPersonKey);

  // Blanks about a signer fill from their Portal record when there is one.
  const emails = signers
    .map((s) => s.email.trim().toLowerCase())
    .filter((e) => EMAIL.test(e));
  const emailKey = emails.join(',');
  useEffect(() => {
    if (!open || !wantsFacts) return;
    const todo = emailKey.split(',').filter((e) => e && !(e in facts));
    if (!todo.length) return;
    const timer = setTimeout(() => {
      todo.forEach((email) =>
        PortalSdk.getData(
          `/api/agreements/autofill?companyId=${companyId}&email=${encodeURIComponent(email)}`,
          null,
        )
          .then((res) =>
            setFacts((f) => ({ ...f, [email]: res?.data?.facts ?? {} })),
          )
          .catch(() => setFacts((f) => ({ ...f, [email]: {} }))),
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [open, wantsFacts, emailKey, companyId, facts]);

  const known = (key: string) => {
    const p = personBlank(key);
    if (!p || !isPersonKey(key)) return null;
    const email = signers[p.n - 1]?.email.trim().toLowerCase();
    return (email && facts[email]?.[p.fact]) || null;
  };
  const parties = signers.map(
    (s, i) => s.name.trim() || s.role.trim() || `Signer ${i + 1}`,
  );

  // Whose boxes go on an uploaded PDF: the signers in order, then whoever
  // signs for the company (0), numbered as the server numbers them.
  const recipients = useMemo((): BoxRecipient[] => {
    const companyEmail = companySigner?.email.toLowerCase() || null;
    const rows = signers.filter(
      (s) => !companyEmail || s.email.trim().toLowerCase() !== companyEmail,
    );
    return [
      ...rows.map((s, i) => ({
        n: i + 1,
        name: s.name.trim() || `Signer ${i + 1}`,
        note: s.role.trim() || undefined,
      })),
      ...(companySigner
        ? [{ n: 0, name: companySigner.name, note: `For ${companyName}` }]
        : []),
    ];
  }, [signers, companySigner, companyName]);
  const placed = boxes.filter((b) => recipients.some((r) => r.n === b.signer));
  const boxesMissing = recipients.filter(
    (r) => !placed.some((b) => b.signer === r.n && b.kind === 'signature'),
  );

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
    fields: fieldDrafts.filter((f) => f.label.trim()),
    endsOn: endsOn || null,
    blocking: category === AGREEMENT_CATEGORY.POLICY && blocking,
    previousId: prefill?.from?.previousId ?? null,
    linkKind: prefill?.from?.linkKind ?? null,
    ccEmails: cc
      .split(/[,\s]+/)
      .map((e) => e.trim())
      .filter(Boolean),
    emailCode,
    source: upload ? { key: upload.key, name: upload.name } : null,
    placements: upload
      ? placed.map(({ id, kind, signer, page, x, y, w, h }) => ({
          id,
          kind,
          signer,
          page,
          x,
          y,
          w,
          h,
        }))
      : [],
  });

  const missing = fields.filter((f) => !values[f]?.trim() && !known(f));
  const signersOk = signers.every(
    (s) => s.name.trim() && EMAIL.test(s.email.trim()),
  );
  const sensitive = fieldDrafts.some((f) =>
    /\b(pan|aadhaar|bank|ifsc|account|passport)\b/i.test(f.label),
  );

  const showPreview = async () => {
    setBusy(true);
    try {
      const res = await PortalSdk.postData(
        '/api/agreements/preview',
        payload(),
      );
      setPreview({
        title: res.data.title,
        body: res.data.body,
        filled: res.data.filled ?? [],
      });
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
          : prefill?.from && step === 'write'
            ? prefill.from.linkKind === 'renewal'
              ? 'Renew this agreement'
              : prefill.from.linkKind === 'amendment'
                ? 'Send an amendment'
                : 'Send it again'
            : step === 'preview'
              ? 'Check and send'
              : step === 'place'
                ? 'Show where each person signs'
                : 'Who signs, and the details'
      }
      description={
        step === 'pick'
          ? 'Upload your own document, or start from a template or a starter draft.'
          : step === 'preview'
            ? 'This is exactly what the signers will read.'
            : step === 'place'
              ? 'Each person sees their boxes on the document, and signs in them.'
              : undefined
      }
      icon="signature"
      size={step === 'place' ? 'xl' : 'lg'}
      footer={
        step === 'pick' ? null : step === 'write' && isUpload ? (
          <>
            {!prefill?.from && (
              <AdminButton
                tone="ghost"
                size="sm"
                onClick={() => setStep('pick')}
              >
                Back
              </AdminButton>
            )}
            <AdminButton
              tone="primary"
              size="sm"
              icon="ink_pen"
              loading={!upload}
              disabled={!upload || !title.trim() || !signersOk}
              onClick={() => setStep('place')}
            >
              Place the boxes
            </AdminButton>
          </>
        ) : step === 'place' ? (
          <>
            <span className="mr-auto text-xs text-neutral-500">
              {boxesMissing.length
                ? `Add a signature box for ${boxesMissing.map((r) => r.name).join(', ')}.`
                : `${placed.length} ${placed.length === 1 ? 'box' : 'boxes'} on ${upload?.document.pages.length ?? 0} ${upload?.document.pages.length === 1 ? 'page' : 'pages'}.`}
            </span>
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
              disabled={boxesMissing.length > 0}
              onClick={send}
            >
              Send to {total} {total === 1 ? 'person' : 'people'}
            </AdminButton>
          </>
        ) : step === 'write' ? (
          <>
            {!prefill?.from && (
              <AdminButton
                tone="ghost"
                size="sm"
                onClick={() => setStep('pick')}
              >
                Back
              </AdminButton>
            )}
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
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Your own document
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                {
                  kind: 'pdf' as const,
                  icon: 'picture_as_pdf',
                  label: 'Upload a PDF',
                  hint: 'Signed as it is. You place the signature, initials and date boxes on its pages.',
                  input: pdfInput,
                },
                {
                  kind: 'word' as const,
                  icon: 'article',
                  label: 'Upload a Word file',
                  hint: 'Turned into text you can edit, with blanks to fill, before it goes out.',
                  input: wordInput,
                },
              ].map((c) => (
                <button
                  key={c.kind}
                  type="button"
                  disabled={!!reading}
                  onClick={() => c.input.current?.click()}
                  className="flex items-start gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3 text-left transition-colors hover:border-white/30 hover:bg-white/[0.05] disabled:cursor-wait"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[20px] text-neutral-300">
                    {reading === c.kind ? (
                      <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Icon name={c.icon} />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-white">
                      {reading === c.kind ? readingText : c.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-neutral-500">
                      {c.hint}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <input
              ref={pdfInput}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) takePdf(f);
              }}
            />
            <input
              ref={wordInput}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) takeWord(f);
              }}
            />
          </div>
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
                        {t.blanks.length
                          ? `${t.blanks.length} blanks to fill`
                          : 'No blanks'}
                        {t.fields.length > 0 &&
                          ` · they fill in ${t.fields.length}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          <p className="text-xs text-neutral-500">
            Starter drafts are not legal advice. Have them checked before the
            first real use, then save your own wording in Agreement templates.
          </p>
        </div>
      )}

      {step === 'write' && (
        <div className="flex flex-col gap-5">
          {prefill?.from && (
            <p className="flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/[0.06] px-3 py-2 text-xs text-sky-200">
              <Icon name="link" className="text-[16px]" />
              {LINK_LABEL[prefill.from.linkKind]} “{prefill.from.previousTitle}
              ”. The two stay linked in both audit trails.
            </p>
          )}
          {upload && (
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-[22px] text-red-300">
                <Icon name="picture_as_pdf" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {upload.document.fileName}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {upload.document.pages.length}{' '}
                  {upload.document.pages.length === 1 ? 'page' : 'pages'} ·{' '}
                  {fileSize(upload.document.size)} · Fingerprint{' '}
                  <span className="font-mono">
                    {upload.document.hash.slice(0, 12)}…
                  </span>
                </p>
              </div>
              <AdminButton
                size="sm"
                tone="ghost"
                icon="swap_horiz"
                onClick={() => pdfInput.current?.click()}
                loading={reading === 'pdf'}
              >
                Replace
              </AdminButton>
              <input
                ref={pdfInput}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) takePdf(f);
                }}
              />
            </div>
          )}
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
            <ToggleSwitch
              checked={emailCode}
              onChange={setEmailCode}
              label="Ask for a code from their email"
              description="Before it opens, each signer enters a 6-digit code emailed to them. Signed in to the Portal, they skip it."
            />
          </div>

          {fields.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                Fill in the blanks
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map((key) => {
                  const auto = known(key);
                  return (
                    <Field
                      key={key}
                      label={fieldLabel(key)}
                      required={!auto}
                      hint={
                        auto
                          ? 'From their Portal record. Type to change it.'
                          : isPersonKey(key)
                            ? 'Not in their Portal record.'
                            : undefined
                      }
                    >
                      <TextInput
                        value={values[key] ?? ''}
                        placeholder={auto ?? undefined}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [key]: e.target.value }))
                        }
                      />
                    </Field>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              They fill in when signing
            </p>
            <FieldsEditor
              fields={fieldDrafts}
              onChange={setFieldDrafts}
              parties={parties}
            />
            <p className="text-xs text-neutral-500">
              {fieldDrafts.length
                ? 'Their answers are saved with their signature and printed in the signed PDF.'
                : 'Optional: ask for an address, PAN, bank details or a tick box.'}
              {sensitive && !isConfidential
                ? ' Bank and ID details make it confidential unless you turn that off.'
                : ''}
            </p>
          </div>

          <div className={cn('flex flex-col gap-2', isUpload && 'hidden')}>
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
                label="Ends on"
                hint="Optional. You hear 30 and 7 days before, to renew it."
              >
                <DateInput
                  value={endsOn}
                  onChange={(e) => setEndsOn(e.target.value)}
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
          {category === AGREEMENT_CATEGORY.POLICY && (
            <ToggleSwitch
              checked={blocking}
              onChange={setBlocking}
              label="They sign it before using the Portal"
              description="Until they do, the Portal opens on this document."
            />
          )}
        </div>
      )}

      {step === 'place' && upload && (
        <PlaceBoxes
          source={{ data: upload.data }}
          pages={upload.document.pages}
          recipients={recipients}
          boxes={boxes}
          onChange={setBoxes}
        />
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
            {endsOn && <Pill icon="event">Ends {day(endsOn)}</Pill>}
          </div>
          {preview.filled.length > 0 && (
            <p className="flex items-start gap-1.5 text-xs text-neutral-400">
              <Icon
                name="auto_awesome"
                className="text-[15px] text-violet-300"
              />
              Filled from their Portal records:{' '}
              {preview.filled.map(fieldLabel).join(', ')}.
            </p>
          )}
          <Paper title={preview.title} body={preview.body} />
          {fieldDrafts.some((f) => f.label.trim()) && (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
                They fill in when signing
              </p>
              <ul className="flex flex-col gap-1 text-sm text-neutral-200">
                {fieldDrafts
                  .filter((f) => f.label.trim())
                  .map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Icon
                        name={f.kind === 'checkbox' ? 'check_box' : 'edit'}
                        className="text-[15px] text-neutral-500"
                      />
                      {f.label}
                      <span className="text-xs text-neutral-500">
                        {parties[Math.min(f.signer, parties.length) - 1]}
                        {f.required ? '' : ' · optional'}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </AdminModal>
  );
};

/* ------------------------------ detail dialog ---------------------------- */

type DetailTab = 'people' | 'details' | 'document' | 'trail';

/** A renewal, amendment or fresh copy of an agreement, for the send dialog. */
const prefillFrom = (
  d: AgreementDetail,
  linkKind: AgreementLinkKind,
): SendPrefill => ({
  from: {
    previousId: d.id,
    linkKind,
    previousTitle: d.title,
    title: d.title,
    body: d.body,
    category: d.category,
    templateId: d.templateId,
    ordered: d.ordered,
    confidential: d.confidential,
    // The company's signer is added again by the rules.
    signers: d.signers
      .filter((s) => !s.company)
      .map((s) => ({
        name: s.name,
        email: s.email,
        role: s.role ?? '',
        order: s.order,
      })),
    fields: d.fields.map(({ signerName: _n, ...f }) => f),
    upload: d.document
      ? {
          key: d.document.key,
          fileName: d.document.fileName,
          size: d.document.size,
          hash: d.document.hash,
          pages: d.document.pages,
          url: d.document.url,
          boxes: d.placements.map((p) => ({
            id: p.id,
            kind: p.kind,
            signer: p.signer,
            page: p.page,
            x: p.x,
            y: p.y,
            w: p.w,
            h: p.h,
          })),
        }
      : null,
  },
});

/** The document's fingerprint, and the signed PDF's once it was issued. */
const Fingerprints = ({ detail }: { detail: AgreementDetail }) => (
  <div className="flex flex-col gap-1">
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
      {detail.document ? 'Original PDF' : 'Text'} SHA-256 {detail.hash}
      {detail.hashOk
        ? ''
        : detail.document
          ? ' (the stored PDF changed)'
          : ' (does not match the text)'}
    </p>
    {detail.sealed && (
      <p className="flex items-center gap-1.5 break-all font-mono text-[11px] text-neutral-500">
        <Icon name="workspace_premium" className="text-[14px]" />
        Signed PDF SHA-256 {detail.sealed.hash}
        <span className="font-sans">
          {' '}
          · issued {when(detail.sealed.at)}, checkable at /verify
        </span>
      </p>
    )}
  </div>
);

const DetailDialog = ({
  id,
  onClose,
  onChanged,
  onOpen,
  onSendFrom,
  canEdit,
  canCreate,
  canDelete,
}: {
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
  /** Open a linked agreement. */
  onOpen: (id: string) => void;
  /** Renew, amend or send it again. */
  onSendFrom: (prefill: SendPrefill) => void;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
}) => {
  const [detail, setDetail] = useState<AgreementDetail | null>(null);
  const [tab, setTab] = useState<DetailTab>('people');
  const [busy, setBusy] = useState<string | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [fixing, setFixing] = useState<{
    signerId: string;
    name: string;
    email: string;
    note: string;
  } | null>(null);
  const [rewriting, setRewriting] = useState<{
    title: string;
    body: string;
    note: string;
  } | null>(null);
  const [endsOn, setEndsOn] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return setDetail(null);
    setTab('people');
    setEndsOn(null);
    PortalSdk.getData(`/api/agreements/${id}`, null)
      .then((res) => setDetail(res.data.agreement))
      .catch((err) => {
        toast.error(errorText(err));
        onClose();
      });
  }, [id, onClose]);

  const DONE: Record<string, string> = {
    void: 'Withdrawn',
    remind: 'Reminder sent',
    'correct-signer': 'Signer corrected',
    'correct-text': 'Text corrected. Signers have the new version.',
    'end-date': 'End date saved',
  };

  const act = async (key: string, data: Record<string, unknown>) => {
    if (!detail) return false;
    setBusy(key);
    try {
      const res = await PortalSdk.putData(`/api/agreements/${detail.id}`, data);
      setDetail(res.data.agreement);
      const errors: Array<{ email: string; error: string }> =
        res?.data?.emailErrors ?? [];
      if (errors.length) toast.warning(`Not sent: ${errors[0].error}`);
      else toast.success(DONE[String(data.action)] ?? 'Saved');
      onChanged();
      return true;
    } catch (err) {
      toast.error(errorText(err));
      return false;
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
              {canCreate &&
                detail.status === AGREEMENT_STATUS.COMPLETED &&
                !detail.rolloutId && (
                  <>
                    <AdminButton
                      size="sm"
                      tone="ghost"
                      icon="edit_document"
                      onClick={() =>
                        onSendFrom(prefillFrom(detail, 'amendment'))
                      }
                    >
                      Amend
                    </AdminButton>
                    <AdminButton
                      size="sm"
                      icon="autorenew"
                      onClick={() => onSendFrom(prefillFrom(detail, 'renewal'))}
                    >
                      Renew
                    </AdminButton>
                  </>
                )}
              {canCreate &&
                !open &&
                detail.status !== AGREEMENT_STATUS.COMPLETED && (
                  <AdminButton
                    size="sm"
                    icon="send"
                    onClick={() => onSendFrom(prefillFrom(detail, 'resend'))}
                  >
                    Send again
                  </AdminButton>
                )}
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
              {detail.emailCode && <Pill icon="pin">Email code</Pill>}
              {detail.document && <Pill icon="picture_as_pdf">PDF</Pill>}
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
                  ...(detail.fields.length
                    ? [
                        {
                          value: 'details' as const,
                          label: 'Filled in',
                          icon: 'edit_note',
                          count: detail.details.length,
                        },
                      ]
                    : []),
                  { value: 'document', label: 'Document', icon: 'description' },
                  { value: 'trail', label: 'Audit trail', icon: 'history' },
                ]}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
              {detail.previous && (
                <button
                  type="button"
                  onClick={() => onOpen(detail.previous!.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-sky-500/20 bg-sky-500/[0.06] px-2 py-0.5 text-sky-200 hover:border-sky-500/40"
                >
                  <Icon name="link" className="text-[13px]" />
                  {LINK_LABEL[detail.linkKind ?? 'renewal']} “
                  {detail.previous.title}”
                </button>
              )}
              {detail.next.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onOpen(n.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-sky-500/20 bg-sky-500/[0.06] px-2 py-0.5 text-sky-200 hover:border-sky-500/40"
                >
                  <Icon name="link" className="text-[13px]" />
                  {n.linkKind === 'amendment'
                    ? 'Amended'
                    : n.linkKind === 'resend'
                      ? 'Sent again'
                      : 'Renewed'}{' '}
                  {day(n.sentAt)} · {STATUS_META[n.status].label}
                </button>
              ))}
              {detail.template && (
                <Pill icon="article">
                  {detail.template.name}
                  {detail.templateVersion
                    ? `, version ${detail.templateVersion}`
                    : ''}
                  {detail.templateVersion &&
                  detail.templateVersion < detail.template.currentVersion
                    ? ` (now ${detail.template.currentVersion})`
                    : ''}
                </Pill>
              )}
              {detail.corrected && (
                <Pill tone="warning" icon="edit_document">
                  Corrected after sending
                </Pill>
              )}
              {detail.blocking && (
                <Pill tone="info" icon="lock_open">
                  Signed before using the Portal
                </Pill>
              )}
              {(detail.status === AGREEMENT_STATUS.COMPLETED || open) && (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="event" className="text-[14px]" />
                  {endsOn !== null && canEdit ? (
                    <>
                      <input
                        type="date"
                        aria-label="Ends on"
                        value={endsOn}
                        onChange={(e) => setEndsOn(e.target.value)}
                        className="h-7 rounded-md border border-white/10 bg-neutral-900 px-2 text-xs text-neutral-200"
                      />
                      <AdminButton
                        size="sm"
                        tone="ghost"
                        loading={busy === 'end-date'}
                        onClick={async () => {
                          if (
                            await act('end-date', {
                              action: 'end-date',
                              endsOn: endsOn || null,
                            })
                          )
                            setEndsOn(null);
                        }}
                      >
                        Save
                      </AdminButton>
                    </>
                  ) : (
                    <>
                      {detail.endsOn
                        ? `Ends ${day(detail.endsOn)}`
                        : 'No end date'}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setEndsOn(detail.endsOn ?? '')}
                          className="text-neutral-500 underline underline-offset-2 hover:text-neutral-200"
                        >
                          {detail.endsOn ? 'Change' : 'Set one'}
                        </button>
                      )}
                    </>
                  )}
                </span>
              )}
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
                        {open && canEdit && !s.signedAt && (
                          <IconAction
                            icon="edit"
                            label="Fix their name or email"
                            onClick={() =>
                              setFixing({
                                signerId: s.id,
                                name: s.name,
                                email: s.email,
                                note: '',
                              })
                            }
                          />
                        )}
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

            {tab === 'details' && (
              <div className="flex flex-col gap-3">
                {detail.fields.length > 0 && !detail.details.length && (
                  <p className="text-sm text-neutral-400">
                    Nobody has filled anything in yet. They fill in{' '}
                    {detail.fields.map((f) => f.label).join(', ')} when they
                    sign.
                  </p>
                )}
                {detail.details.map((d) => (
                  <div
                    key={d.signerId}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"
                  >
                    <p className="mb-2 text-sm font-medium text-white">
                      {d.name}
                    </p>
                    <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[200px_1fr]">
                      {d.values.map((v) => (
                        <div key={v.label} className="contents">
                          <dt className="text-neutral-500">{v.label}</dt>
                          <dd className="whitespace-pre-line text-neutral-100">
                            {v.text || '—'}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            )}

            {tab === 'document' && detail.document && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-[22px] text-red-300">
                    <Icon name="picture_as_pdf" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {detail.document.fileName}
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Uploaded PDF, signed as it is ·{' '}
                      {detail.document.pages.length}{' '}
                      {detail.document.pages.length === 1 ? 'page' : 'pages'} ·{' '}
                      {fileSize(detail.document.size)}
                    </p>
                  </div>
                  <a
                    href={`${detail.document.url}?download=1`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-neutral-100 hover:bg-white/[0.09]"
                  >
                    <Icon name="download" className="text-[16px]" />
                    Original
                  </a>
                </div>
                <BoxesPreview
                  source={{ url: detail.document.url }}
                  pages={detail.document.pages}
                  boxes={detail.placements.map((p) => {
                    const signer = detail.signers.find(
                      (x) => x.id === p.signerId,
                    );
                    const sig = detail.signatures.find(
                      (x) => x.signerId === p.signerId,
                    );
                    return {
                      ...p,
                      name: signer?.name ?? 'Signer',
                      signed: sig
                        ? {
                            name: sig.name,
                            image: sig.image,
                            initials: sig.initials,
                            at: sig.at,
                          }
                        : null,
                    };
                  })}
                />
                <Fingerprints detail={detail} />
              </div>
            )}

            {tab === 'document' && !detail.document && (
              <div className="flex flex-col gap-2">
                {open && canEdit && (
                  <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-xs text-neutral-400">
                    <Icon name="edit_document" className="text-[16px]" />
                    <span className="flex-1">
                      A typo or a wrong figure? Correct it here: everyone who
                      signed signs the new version.
                    </span>
                    <AdminButton
                      size="sm"
                      onClick={() =>
                        setRewriting({
                          title: detail.title,
                          body: detail.body,
                          note: '',
                        })
                      }
                    >
                      Correct the text
                    </AdminButton>
                  </div>
                )}
                <Paper body={detail.body} />
                <Fingerprints detail={detail} />
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

      <AdminModal
        open={!!fixing}
        onOpenChange={(o) => !o && setFixing(null)}
        title="Fix a signer"
        description="A new email gets a new link, and the old one stops working."
        icon="edit"
        size="sm"
        footer={
          <>
            <AdminButton size="sm" tone="ghost" onClick={() => setFixing(null)}>
              Cancel
            </AdminButton>
            <AdminButton
              size="sm"
              tone="primary"
              loading={busy === 'correct-signer'}
              disabled={
                !fixing?.name.trim() || !EMAIL.test(fixing?.email.trim() ?? '')
              }
              onClick={async () => {
                if (!fixing) return;
                if (
                  await act('correct-signer', {
                    action: 'correct-signer',
                    ...fixing,
                  })
                )
                  setFixing(null);
              }}
            >
              Save and resend
            </AdminButton>
          </>
        }
      >
        {fixing && (
          <div className="flex flex-col gap-3">
            <Field label="Full legal name">
              <TextInput
                value={fixing.name}
                onChange={(e) => setFixing({ ...fixing, name: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <TextInput
                type="email"
                value={fixing.email}
                onChange={(e) =>
                  setFixing({ ...fixing, email: e.target.value })
                }
              />
            </Field>
            <Field label="Why (in the audit trail)">
              <TextInput
                value={fixing.note}
                placeholder="e.g. typo in the email"
                onChange={(e) => setFixing({ ...fixing, note: e.target.value })}
              />
            </Field>
          </div>
        )}
      </AdminModal>

      <AdminModal
        open={!!rewriting}
        onOpenChange={(o) => !o && setRewriting(null)}
        title="Correct the text"
        description={
          detail?.signatures.length
            ? `${detail.signatures.map((x) => x.name).join(', ')} signed already and will be asked to sign again.`
            : 'Signers get the corrected version by email.'
        }
        icon="edit_document"
        size="lg"
        footer={
          <>
            <AdminButton
              size="sm"
              tone="ghost"
              onClick={() => setRewriting(null)}
            >
              Cancel
            </AdminButton>
            <AdminButton
              size="sm"
              tone="primary"
              loading={busy === 'correct-text'}
              disabled={!rewriting?.title.trim() || !rewriting?.body.trim()}
              onClick={async () => {
                if (!rewriting) return;
                if (
                  await act('correct-text', {
                    action: 'correct-text',
                    ...rewriting,
                  })
                )
                  setRewriting(null);
              }}
            >
              Send the corrected version
            </AdminButton>
          </>
        }
      >
        {rewriting && (
          <div className="flex flex-col gap-3">
            <Field label="Title">
              <TextInput
                value={rewriting.title}
                onChange={(e) =>
                  setRewriting({ ...rewriting, title: e.target.value })
                }
              />
            </Field>
            <TextArea
              value={rewriting.body}
              onChange={(e) =>
                setRewriting({ ...rewriting, body: e.target.value })
              }
              className="min-h-[360px] font-mono text-[13px]"
            />
            <Field
              label="What changed"
              hint="In the email to the signers, and the audit trail."
            >
              <TextInput
                value={rewriting.note}
                placeholder="e.g. Fixed the start date"
                onChange={(e) =>
                  setRewriting({ ...rewriting, note: e.target.value })
                }
              />
            </Field>
          </div>
        )}
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
    fields: FieldDraft[];
  } | null>(null);
  const [mode, setMode] = useState<'edit' | 'preview' | 'versions'>('edit');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [versions, setVersions] = useState<TemplateVersionView[] | null>(null);
  const [openVersion, setOpenVersion] = useState<number | null>(null);

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
      fields: toDrafts(active.fields),
    });
    setMode('edit');
    setVersions(null);
    setOpenVersion(null);
  }, [active]);

  useEffect(() => {
    if (mode !== 'versions' || !active || active.builtIn) return;
    PortalSdk.getData(
      `/api/agreements/templates?companyId=${companyId}&versions=${active.id}`,
      null,
    )
      .then((res) => setVersions(res?.data?.versions ?? []))
      .catch((err) => toast.error(errorText(err)));
  }, [mode, active, companyId]);

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
        fields: draft.fields.filter((f) => f.label.trim()),
      });
      const v = res.data.template.version;
      toast.success(
        draft.id && active && v > active.version
          ? `Saved as version ${v}. Agreements already sent keep their wording.`
          : 'Template saved',
      );
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
      fields: [],
    });
  };

  const parties = (draft?.roles ?? '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);

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
                {t.builtIn ? 'Starter draft' : `Yours · v${t.version}`}
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
                ...(draft.id
                  ? [
                      {
                        value: 'versions' as const,
                        label: 'Versions',
                        icon: 'history',
                      },
                    ]
                  : []),
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
          {mode === 'versions' ? (
            <div className="p-4">
              {!versions ? (
                <SkeletonRows rows={2} />
              ) : (
                <ol className="flex flex-col gap-2">
                  {versions.map((v) => (
                    <li
                      key={v.version}
                      className="rounded-xl border border-white/[0.07] bg-white/[0.02]"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenVersion(
                            openVersion === v.version ? null : v.version,
                          )
                        }
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                      >
                        <span className="text-sm font-medium text-white">
                          Version {v.version}
                        </span>
                        {v.current && <Pill tone="positive">Current</Pill>}
                        <span className="flex-1 truncate text-xs text-neutral-500">
                          {when(v.savedAt)} · {v.savedBy}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {v.sent} sent
                        </span>
                        <Icon
                          name={
                            openVersion === v.version
                              ? 'expand_less'
                              : 'expand_more'
                          }
                          className="text-[18px] text-neutral-500"
                        />
                      </button>
                      {openVersion === v.version && (
                        <div className="flex flex-col gap-2 border-t border-white/[0.07] p-3">
                          <Paper title={v.title} body={v.body} />
                          {canEdit && !v.current && (
                            <AdminButton
                              size="sm"
                              icon="restore"
                              className="self-end"
                              onClick={() => {
                                setDraft({
                                  ...draft,
                                  title: v.title,
                                  body: v.body,
                                  fields: toDrafts(v.fields),
                                });
                                setMode('edit');
                                toast.message(
                                  `Version ${v.version} is in the editor. Save to make it the current one.`,
                                );
                              }}
                            >
                              Start from this version
                            </AdminButton>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ) : mode === 'edit' ? (
            <div className="flex flex-col gap-4 p-4">
              <textarea
                value={draft.body}
                readOnly={!canEdit}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                spellCheck
                className="custom-scrollbar min-h-[460px] w-full resize-y rounded-lg border border-white/10 bg-neutral-900/80 p-4 font-mono text-[13px] leading-relaxed text-neutral-200 focus:border-white/25 focus:outline-none"
              />
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Signers fill in when signing
                </p>
                <FieldsEditor
                  fields={draft.fields}
                  onChange={(fields) => setDraft({ ...draft, fields })}
                  parties={parties.length ? parties : ['Signer 1']}
                  disabled={!canEdit}
                />
                <p className="text-xs text-neutral-500">
                  Blanks about a signer, such as {'{{signer1Address}}'} or{' '}
                  {'{{signer1Title}}'}, fill in from their Portal record when
                  you send.
                </p>
              </div>
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

/* ---------------------------------- tabs --------------------------------- */

type CompanyTabProps = {
  selectedCompanyId: string | null;
  onSelectCompany: (companyId: string) => void;
};

/** The companies whose agreements someone can see, and the one picked. */
const useAgreementCompany = (selectedCompanyId: string | null) => {
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
  return { readable, companyId, companyName, can };
};

const NEEDS_COMPANY = 'Agreements are sent by company owners, HR and managers.';

/** Admin > Administration > Signing rules. */
export const AdminSigningRules = ({
  selectedCompanyId,
  onSelectCompany,
}: CompanyTabProps) => {
  const { readable, companyId, can } = useAgreementCompany(selectedCompanyId);
  const [settings, setSettings] = useState<SettingsView | null>(null);

  useEffect(() => {
    if (!companyId) return;
    setSettings(null);
    PortalSdk.getData(`/api/agreements/settings?companyId=${companyId}`, null)
      .then((res) => setSettings(res?.data?.settings ?? null))
      .catch((err) => toast.error(errorText(err)));
  }, [companyId]);

  if (!companyId) return <NeedsCompany text={NEEDS_COMPANY} />;
  return (
    <div className="flex flex-col gap-5">
      <CompanyPicker
        companies={readable}
        value={companyId}
        onChange={onSelectCompany}
      />
      <SigningRulesView
        companyId={companyId}
        settings={settings}
        canEdit={can(companyId, 'agreements:edit')}
        onSaved={setSettings}
      />
    </div>
  );
};

/** Admin > Administration > Agreement templates. */
export const AdminAgreementTemplates = ({
  selectedCompanyId,
  onSelectCompany,
}: CompanyTabProps) => {
  const { readable, companyId, can } = useAgreementCompany(selectedCompanyId);
  const [templates, setTemplates] = useState<TemplateView[]>([]);

  const load = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await PortalSdk.getData(
        `/api/agreements/templates?companyId=${companyId}`,
        null,
      );
      setTemplates(res?.data?.templates ?? []);
    } catch (err) {
      toast.error(errorText(err));
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!companyId) return <NeedsCompany text={NEEDS_COMPANY} />;
  return (
    <div className="flex flex-col gap-5">
      <CompanyPicker
        companies={readable}
        value={companyId}
        onChange={onSelectCompany}
      />
      <TemplatesView
        companyId={companyId}
        templates={templates}
        canEdit={can(companyId, 'agreements:edit')}
        onChanged={load}
      />
    </div>
  );
};

type View = 'overview' | 'documents' | 'people' | 'policies' | 'letters';
const VIEWS: View[] = [
  'overview',
  'documents',
  'people',
  'policies',
  'letters',
];

/** Admin > Companies > Agreements: the documents, and each person's file. */
export const AdminAgreements = ({
  selectedCompanyId,
  onSelectCompany,
}: CompanyTabProps) => {
  const { readable, companyId, companyName, can } =
    useAgreementCompany(selectedCompanyId);

  const [view, setView] = useState<View>('overview');
  const [templates, setTemplates] = useState<TemplateView[]>([]);
  const [settings, setSettings] = useState<SettingsView | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sending, setSending] = useState<SendPrefill | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [letterId, setLetterId] = useState<string | null>(null);

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

  // Opened from an email or a link: ?agreement=<id>, or ?view=people.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('agreement');
    if (id && /^[a-f0-9]{24}$/i.test(id)) {
      setOpenId(id);
      setView('documents');
    }
    const v = params.get('view') as View | null;
    if (v && VIEWS.includes(v)) setView(v);
    const letter = params.get('letter');
    if (letter && /^[a-f0-9]{24}$/i.test(letter)) setLetterId(letter);
  }, []);

  const closeDetail = useCallback(() => setOpenId(null), []);

  const openAny = useCallback(
    (
      id: string,
      source: string,
      link: string | null,
      pdfUrl?: string | null,
    ) => {
      if (source === 'onboarding') {
        if (link) window.location.href = link;
        return;
      }
      // Signed elsewhere: the PDF is the document.
      if (source === 'imported') {
        if (pdfUrl) window.open(pdfUrl, '_blank', 'noopener');
        return;
      }
      setOpenId(id);
    },
    [],
  );

  const openRow = useCallback(
    (row: VaultRow) => openAny(row.id, row.source, row.link, row.pdfUrl),
    [openAny],
  );

  const sendFrom = useCallback((prefill: SendPrefill) => {
    setOpenId(null);
    setSending(prefill);
  }, []);

  if (!companyId) return <NeedsCompany text={NEEDS_COMPANY} />;

  const canCreate = can(companyId, 'agreements:create');
  const canEdit = can(companyId, 'agreements:edit');
  const canDelete = can(companyId, 'agreements:delete');
  // Letters carry pay and personal details: HR and owners.
  const canLetters = canCreate && can(companyId, 'confidential:read');

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
            { value: 'overview', label: 'Overview', icon: 'space_dashboard' },
            { value: 'documents', label: 'Documents', icon: 'folder_open' },
            { value: 'people', label: 'People', icon: 'folder_shared' },
            { value: 'policies', label: 'Policies', icon: 'campaign' },
            ...(canLetters
              ? [
                  {
                    value: 'letters' as const,
                    label: 'Letters',
                    icon: 'contract',
                  },
                ]
              : []),
          ]}
        />
        <div className="flex-1" />
        {canCreate && (
          <>
            <AdminButton icon="upload_file" onClick={() => setImporting(true)}>
              Import
            </AdminButton>
            <AdminButton
              tone="primary"
              icon="send"
              disabled={!templates.length}
              onClick={() => setSending({})}
            >
              Send an agreement
            </AdminButton>
          </>
        )}
      </div>

      {view === 'letters' && canLetters ? (
        <LettersView
          companyId={companyId}
          companyName={companyName}
          refreshKey={refreshKey}
          openLetterId={letterId}
          onOpenAgreement={setOpenId}
          onChanged={changed}
        />
      ) : view === 'overview' ? (
        <OverviewView
          companyId={companyId}
          refreshKey={refreshKey}
          onOpen={(id, source, link) => openAny(id, source, link)}
          onShow={setView}
        />
      ) : view === 'policies' ? (
        <PoliciesView
          companyId={companyId}
          refreshKey={refreshKey}
          templates={templates}
          settings={settings}
          canCreate={canCreate}
          canEdit={canEdit}
          onOpen={setOpenId}
          onChanged={changed}
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
        onOpen={setOpenId}
        onSendFrom={sendFrom}
        canEdit={canEdit}
        canCreate={canCreate}
        canDelete={canDelete}
      />
      <ImportDialog
        open={importing}
        onOpenChange={setImporting}
        companyId={companyId}
        settings={settings}
        onImported={changed}
      />
    </div>
  );
};

/** Admin > Administration > Required documents. */
export const AdminRequiredDocuments = ({
  selectedCompanyId,
  onSelectCompany,
}: CompanyTabProps) => {
  const { readable, companyId, can } = useAgreementCompany(selectedCompanyId);
  const [settings, setSettings] = useState<SettingsView | null>(null);
  const [templates, setTemplates] = useState<TemplateView[]>([]);

  useEffect(() => {
    if (!companyId) return;
    setSettings(null);
    Promise.all([
      PortalSdk.getData(
        `/api/agreements/settings?companyId=${companyId}`,
        null,
      ),
      PortalSdk.getData(
        `/api/agreements/templates?companyId=${companyId}`,
        null,
      ),
    ])
      .then(([s, t]) => {
        setSettings(s?.data?.settings ?? null);
        setTemplates(t?.data?.templates ?? []);
      })
      .catch((err) => toast.error(errorText(err)));
  }, [companyId]);

  if (!companyId) return <NeedsCompany text={NEEDS_COMPANY} />;
  return (
    <div className="flex flex-col gap-5">
      <CompanyPicker
        companies={readable}
        value={companyId}
        onChange={onSelectCompany}
      />
      <RequiredDocsView
        companyId={companyId}
        settings={settings}
        templates={templates}
        canEdit={can(companyId, 'agreements:edit')}
        canCreate={can(companyId, 'agreements:create')}
        onSaved={setSettings}
      />
    </div>
  );
};
