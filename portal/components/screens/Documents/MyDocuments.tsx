'use client';

import { Caveat } from 'next/font/google';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { errorText } from '@/components/screens/Admin/Workspace/shared';
import { SignaturePad } from '@/components/shared/SignaturePad';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { LetterStatus, myLetters } from '@/lib/agreements/letters';
import type { MyDoc, MyDocuments } from '@/lib/agreements/mine';
import type { SavedSignatureView } from '@/lib/agreements/signers';
import { cn } from '@/lib/utils';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

/*
 * A person's own documents in the portal: what's waiting for their
 * signature (or, for the owner and hiring lead, their approval for the
 * company), everything they signed, and their saved signature. The Home
 * card (light) and the Documents tab of their page (dark) both use these.
 */

const hand = Caveat({ subsets: ['latin'], weight: ['600'] });

const day = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

const Icon = ({ name, className }: { name: string; className?: string }) => (
  <span
    aria-hidden
    className={cn('material-symbols-outlined leading-none', className)}
  >
    {name}
  </span>
);

const THEMES = {
  light: {
    card: 'bg-white ring-1 ring-neutral-200',
    title: 'text-neutral-900',
    muted: 'text-neutral-500',
    divide: 'divide-neutral-100',
    ghost: 'text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50',
    primary: 'bg-neutral-900 text-white hover:bg-neutral-700',
    footer: 'border-neutral-100 bg-neutral-50',
    seg: 'bg-neutral-100',
    segOn: 'bg-white text-neutral-900 shadow-sm',
    segOff: 'text-neutral-500 hover:text-neutral-800',
    input:
      'border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400',
    dialog: 'border-neutral-200 bg-white text-neutral-900',
    company: 'bg-violet-50 text-violet-700',
    party: 'bg-amber-50 text-amber-700',
    skeleton: 'bg-neutral-100',
  },
  dark: {
    card: 'bg-white/[0.03] ring-1 ring-white/[0.07]',
    title: 'text-neutral-100',
    muted: 'text-neutral-500',
    divide: 'divide-white/[0.06]',
    ghost: 'text-neutral-200 ring-1 ring-white/10 hover:bg-white/[0.06]',
    primary: 'bg-white text-neutral-950 hover:bg-neutral-200',
    footer: 'border-white/[0.06] bg-white/[0.02]',
    seg: 'bg-white/[0.05]',
    segOn: 'bg-white/10 text-white',
    segOff: 'text-neutral-400 hover:text-neutral-200',
    input:
      'border-white/10 bg-white/[0.03] text-neutral-100 placeholder:text-neutral-600 focus:border-white/25',
    dialog: 'border-white/10 bg-neutral-900 text-neutral-100',
    company: 'bg-violet-400/10 text-violet-300',
    party: 'bg-amber-400/10 text-amber-300',
    skeleton: 'bg-white/[0.04]',
  },
};
type Theme = keyof typeof THEMES;

/* --------------------------------- data ---------------------------------- */

export function useMyDocuments() {
  const [data, setData] = useState<MyDocuments | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    PortalSdk.getData('/api/me/documents', null)
      .then((res) => setData(res?.data ?? null))
      .catch(() => setData({ toSign: [], documents: [], signature: null }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (refs: string[], key: string) => {
    setBusy(key);
    try {
      const res = await PortalSdk.postData('/api/me/documents/approve', {
        refs,
      });
      setData(res?.data ?? null);
      const failed: Array<{ error: string }> = res?.data?.failed ?? [];
      if (failed.length)
        toast.warning(
          `${refs.length - failed.length} approved. ${failed[0].error}`,
        );
      else
        toast.success(
          refs.length === 1 ? 'Approved' : `Approved ${refs.length} documents`,
        );
      return true;
    } catch (err) {
      toast.error(errorText(err, 'Could not approve it.'));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const setSignature = (signature: SavedSignatureView) =>
    setData((d) => (d ? { ...d, signature } : d));

  return { data, load, approve, busy, setSignature };
}

/* ---------------------------- saved signature ---------------------------- */

export const SignatureDialog = ({
  open,
  onOpenChange,
  current,
  purpose,
  onSaved,
  theme = 'light',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: SavedSignatureView;
  /** Why it's asked for now, e.g. before the first approval. */
  purpose?: string;
  onSaved: (s: SavedSignatureView) => void;
  theme?: Theme;
}) => {
  const t = THEMES[theme];
  const { user } = useUser();
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'type' | 'draw'>('type');
  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(current?.name ?? user?.name ?? '');
    setMode(current?.method === 'drawn' ? 'draw' : 'type');
    setImage(null);
  }, [open, current, user?.name]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await PortalSdk.putData('/api/me/signature', {
        name,
        image: mode === 'draw' ? image : null,
      });
      onOpenChange(false);
      toast.success('Signature saved');
      onSaved(res?.data?.signature ?? null);
    } catch (err) {
      toast.error(errorText(err, 'Could not save it.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-lg', t.dialog)}>
        <DialogHeader>
          <DialogTitle>
            {current ? 'Change your signature' : 'Save your signature'}
          </DialogTitle>
          <DialogDescription className={t.muted}>
            {purpose ??
              'It goes on documents you approve in the Portal, so you sign once and approve with one click after that.'}
          </DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-1.5">
          <span className={cn('text-xs font-medium', t.muted)}>
            Your full name, as you sign it
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className={cn(
              'h-11 rounded-lg border px-3 text-sm outline-none',
              t.input,
            )}
          />
        </label>
        <div
          className={cn(
            'inline-flex self-start rounded-lg p-1 text-xs font-semibold',
            t.seg,
          )}
        >
          {(['type', 'draw'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'rounded-md px-3 py-1.5',
                mode === m ? t.segOn : t.segOff,
              )}
            >
              {m === 'type' ? 'Typed' : 'Drawn'}
            </button>
          ))}
        </div>
        {mode === 'type' ? (
          <div className="flex h-20 items-end rounded-xl bg-white px-4 pb-3">
            <span
              className={cn(
                hand.className,
                'w-full border-b border-neutral-300 pb-1 text-[38px] leading-none',
                name ? 'text-neutral-900' : 'text-neutral-300',
              )}
            >
              {name || 'Your signature'}
            </span>
          </div>
        ) : (
          <SignaturePad onChange={setImage} />
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn('h-10 rounded-lg px-4 text-sm font-medium', t.ghost)}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={
              saving || name.trim().length < 2 || (mode === 'draw' && !image)
            }
            onClick={save}
            className={cn(
              'h-10 rounded-lg px-4 text-sm font-semibold disabled:opacity-40',
              t.primary,
            )}
          >
            {saving ? 'Saving…' : 'Save signature'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/** A saved signature on a strip of paper, so it reads on any background. */
export const SignatureMark = ({
  signature,
}: {
  signature: NonNullable<SavedSignatureView>;
}) => (
  <div className="inline-flex h-16 min-w-[180px] items-end rounded-lg bg-white px-4 pb-2 shadow-sm ring-1 ring-black/5">
    {signature.image ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={signature.image}
        alt="Your saved signature"
        className="h-12 w-auto object-contain object-left"
      />
    ) : (
      <span
        className={cn(
          hand.className,
          'text-[32px] leading-none text-neutral-900',
        )}
      >
        {signature.name}
      </span>
    )}
  </div>
);

/* --------------------------------- rows ---------------------------------- */

const STATUS: Record<
  MyDoc['status'],
  { label: string; light: string; dark: string; icon: string }
> = {
  TO_SIGN: {
    label: 'Waiting for you',
    light: 'bg-amber-50 text-amber-800 ring-amber-200',
    dark: 'bg-amber-400/10 text-amber-300 ring-amber-400/20',
    icon: 'draw',
  },
  UP_NEXT: {
    label: 'You sign later',
    light: 'bg-neutral-100 text-neutral-600 ring-neutral-200',
    dark: 'bg-white/[0.05] text-neutral-400 ring-white/10',
    icon: 'schedule',
  },
  WAITING_OTHERS: {
    label: 'Waiting for others',
    light: 'bg-sky-50 text-sky-800 ring-sky-200',
    dark: 'bg-sky-400/10 text-sky-300 ring-sky-400/20',
    icon: 'hourglass_top',
  },
  COMPLETED: {
    label: 'Signed',
    light: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    dark: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20',
    icon: 'task_alt',
  },
  DECLINED: {
    label: 'Declined',
    light: 'bg-rose-50 text-rose-700 ring-rose-200',
    dark: 'bg-rose-400/10 text-rose-300 ring-rose-400/20',
    icon: 'block',
  },
  VOIDED: {
    label: 'Withdrawn',
    light: 'bg-neutral-100 text-neutral-600 ring-neutral-200',
    dark: 'bg-white/[0.05] text-neutral-400 ring-white/10',
    icon: 'cancel',
  },
  EXPIRED: {
    label: 'Expired',
    light: 'bg-neutral-100 text-neutral-600 ring-neutral-200',
    dark: 'bg-white/[0.05] text-neutral-400 ring-white/10',
    icon: 'timer_off',
  },
};

export const StatusChip = ({
  status,
  theme = 'light',
}: {
  status: MyDoc['status'];
  theme?: Theme;
}) => {
  const s = STATUS[status];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
        s[theme],
      )}
    >
      <Icon name={s.icon} className="text-[13px]" />
      {s.label}
    </span>
  );
};

const ToSignRow = ({
  doc,
  busy,
  onApprove,
  theme,
}: {
  doc: MyDoc;
  busy: boolean;
  onApprove: () => void;
  theme: Theme;
}) => {
  const t = THEMES[theme];
  // The title opens it to read; the one button signs or approves it.
  const readHref =
    doc.signUrl ?? (doc.pdfUrl ? `${doc.pdfUrl}&inline=1` : null);
  const sub = [
    doc.as === 'company' ? `For ${doc.companyName}` : doc.companyName,
    doc.others.length ? `with ${doc.others.join(', ')}` : null,
    doc.expiresOn ? `by ${day(doc.expiresOn)}` : null,
    doc.blocking ? 'needed before using the Portal' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className="flex items-center gap-3 p-3">
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg text-[18px]',
          doc.as === 'company' ? t.company : t.party,
        )}
      >
        <Icon name={doc.as === 'company' ? 'approval' : 'draw'} />
      </span>
      <div className="min-w-0 flex-1">
        {readHref ? (
          <a
            href={readHref}
            target={doc.signUrl ? undefined : '_blank'}
            rel="noreferrer"
            title="Read it"
            className={cn(
              'block truncate text-sm font-medium hover:underline',
              t.title,
            )}
          >
            {doc.title}
          </a>
        ) : (
          <p className={cn('truncate text-sm font-medium', t.title)}>
            {doc.title}
          </p>
        )}
        <p className={cn('truncate text-xs', t.muted)}>{sub}</p>
      </div>
      {doc.canApprove ? (
        <button
          type="button"
          disabled={busy}
          onClick={onApprove}
          className={cn(
            'inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-3 text-xs font-semibold disabled:opacity-50',
            t.primary,
          )}
        >
          <Icon name="verified" className="text-[15px]" />
          {busy ? 'Approving…' : 'Approve'}
        </button>
      ) : (
        doc.signUrl && (
          <a
            href={doc.signUrl}
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-3 text-xs font-semibold',
              t.primary,
            )}
          >
            <Icon name="draw" className="text-[15px]" />
            Sign
          </a>
        )
      )}
    </div>
  );
};

/**
 * What's waiting, with Approve buttons. Approving needs a saved signature:
 * the first time, it asks for one, then approves.
 */
const ToSignList = ({
  docs,
  signature,
  approve,
  busy,
  onSignature,
  theme,
}: {
  docs: MyDoc[];
  signature: SavedSignatureView;
  approve: (refs: string[], key: string) => Promise<boolean>;
  busy: string | null;
  onSignature: (s: SavedSignatureView) => void;
  theme: Theme;
}) => {
  const t = THEMES[theme];
  const [asking, setAsking] = useState<string[] | null>(null);
  const companyRefs = docs
    .filter((d) => d.as === 'company' && d.canApprove)
    .map((d) => d.ref);
  const keyOf = (refs: string[]) => (refs.length > 1 ? 'all' : refs[0]);

  const start = (refs: string[]) => {
    if (signature) void approve(refs, keyOf(refs));
    else setAsking(refs);
  };

  return (
    <>
      <div className={cn('flex flex-col divide-y', t.divide)}>
        {docs.map((d) => (
          <ToSignRow
            key={d.ref}
            doc={d}
            theme={theme}
            busy={busy === d.ref || busy === 'all'}
            onApprove={() => start([d.ref])}
          />
        ))}
      </div>
      {companyRefs.length > 1 && (
        <div
          className={cn(
            'flex items-center justify-between gap-3 border-t px-3 py-2.5',
            t.footer,
          )}
        >
          <p className={cn('text-xs', t.muted)}>
            {companyRefs.length} documents need the company&apos;s signature.
          </p>
          <button
            type="button"
            disabled={busy === 'all'}
            onClick={() => start(companyRefs)}
            className="inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            <Icon name="done_all" className="text-[15px]" />
            {busy === 'all'
              ? 'Approving…'
              : `Approve all ${companyRefs.length}`}
          </button>
        </div>
      )}
      <SignatureDialog
        open={!!asking}
        onOpenChange={(o) => !o && setAsking(null)}
        current={null}
        theme={theme}
        purpose="Sign once here. It's saved to your profile and goes on this document, and after this every approval is one click."
        onSaved={(s) => {
          onSignature(s);
          const refs = asking ?? [];
          setAsking(null);
          if (refs.length) void approve(refs, keyOf(refs));
        }}
      />
    </>
  );
};

/** Home: shown only while something waits for the person's signature. */
export const ToSignSection = () => {
  const { data, approve, busy, setSignature } = useMyDocuments();
  if (!data?.toSign.length) return null;
  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between px-4">
        <h4 className="text-lg font-bold">Waiting for your signature</h4>
        <Link
          href={APP_ROUTES.myDocuments}
          className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
        >
          All documents
        </Link>
      </div>
      <div className="m-4 mt-3 overflow-hidden rounded-xl bg-white shadow-md">
        <ToSignList
          docs={data.toSign}
          signature={data.signature}
          approve={approve}
          busy={busy}
          onSignature={setSignature}
          theme="light"
        />
      </div>
    </div>
  );
};

/* ---------------------------- documents tab ------------------------------ */

/* -------------------------------- letters --------------------------------- */

type LettersData = Awaited<ReturnType<typeof myLetters>>;

const LETTER_STATUS: Record<
  LetterStatus,
  { label: string; tone: 'amber' | 'sky' | 'emerald' | 'rose' | 'neutral' }
> = {
  REQUESTED: { label: 'Asked', tone: 'amber' },
  SIGNING: { label: 'Being signed', tone: 'sky' },
  READY: { label: 'Ready', tone: 'emerald' },
  NOT_SIGNED: { label: 'With HR', tone: 'amber' },
  DECLINED: { label: 'Declined', tone: 'rose' },
  CANCELLED: { label: 'Withdrawn', tone: 'neutral' },
};

const LETTER_TONES = {
  light: {
    amber: 'bg-amber-50 text-amber-700',
    sky: 'bg-sky-50 text-sky-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
    neutral: 'bg-neutral-100 text-neutral-600',
  },
  dark: {
    amber: 'bg-amber-400/10 text-amber-300',
    sky: 'bg-sky-400/10 text-sky-300',
    emerald: 'bg-emerald-400/10 text-emerald-300',
    rose: 'bg-rose-400/10 text-rose-300',
    neutral: 'bg-white/[0.06] text-neutral-400',
  },
};

const RequestLetterDialog = ({
  open,
  onOpenChange,
  data,
  onAsked,
  theme,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: LettersData;
  onAsked: () => void;
  theme: Theme;
}) => {
  const t = THEMES[theme];
  const [companyId, setCompanyId] = useState('');
  const [kind, setKind] = useState('');
  const [purpose, setPurpose] = useState('');
  const [addressedTo, setAddressedTo] = useState('');
  const [neededBy, setNeededBy] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCompanyId(data.companies[0]?.id ?? '');
    setKind(data.kinds[0]?.kind ?? '');
    setPurpose('');
    setAddressedTo('');
    setNeededBy('');
    setNote('');
  }, [open, data]);

  const ask = async () => {
    setBusy(true);
    try {
      await PortalSdk.postData('/api/me/letters', {
        companyId,
        kind,
        purpose,
        addressedTo,
        neededBy: neededBy || null,
        note,
      });
      toast.success(
        'Asked. HR checks it, and the signed letter comes here and to your email.',
      );
      onOpenChange(false);
      onAsked();
    } catch (err) {
      toast.error(errorText(err, 'Could not ask for it.'));
    } finally {
      setBusy(false);
    }
  };

  const input = cn(
    'h-10 w-full rounded-lg border px-3 text-sm outline-none',
    t.input,
  );
  const label = cn('text-xs font-medium', t.muted);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-lg', t.dialog)}>
        <DialogHeader>
          <DialogTitle>Ask for a letter</DialogTitle>
          <DialogDescription className={t.muted}>
            HR checks the details from your record, the company signs it, and
            the signed PDF comes to your documents and your email.
          </DialogDescription>
        </DialogHeader>
        {data.companies.length > 1 && (
          <label className="flex flex-col gap-1.5">
            <span className={label}>From</span>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className={input}
            >
              {data.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex flex-col gap-1.5">
          <span className={label}>Which letter</span>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {data.kinds.map((k) => (
              <button
                key={k.kind}
                type="button"
                onClick={() => setKind(k.kind)}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left',
                  kind === k.kind
                    ? theme === 'light'
                      ? 'border-neutral-900 bg-neutral-50'
                      : 'border-white/40 bg-white/[0.06]'
                    : theme === 'light'
                      ? 'border-neutral-200 hover:border-neutral-300'
                      : 'border-white/10 hover:border-white/20',
                )}
              >
                <span className={cn('text-sm font-medium', t.title)}>
                  {k.label}
                </span>
                <span className={cn('text-[11px] leading-snug', t.muted)}>
                  {k.hint}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={label}>What it’s for (optional)</span>
            <input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="A visa application"
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Addressed to (optional)</span>
            <input
              value={addressedTo}
              onChange={(e) => setAddressedTo(e.target.value)}
              placeholder="To whom it may concern"
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Needed by (optional)</span>
            <input
              type="date"
              value={neededBy}
              onChange={(e) => setNeededBy(e.target.value)}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Note for HR (optional)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={input}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn('h-10 rounded-lg px-4 text-sm font-medium', t.ghost)}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !companyId || !kind}
            onClick={ask}
            className={cn(
              'h-10 rounded-lg px-4 text-sm font-semibold disabled:opacity-40',
              t.primary,
            )}
          >
            {busy ? 'Asking…' : 'Ask HR'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/** Letters someone asked for: where each one is, and the PDF once ready. */
const LettersSection = ({ theme }: { theme: Theme }) => {
  const t = THEMES[theme];
  const [data, setData] = useState<LettersData | null>(null);
  const [asking, setAsking] = useState(false);

  const load = useCallback(() => {
    PortalSdk.getData('/api/me/letters', null)
      .then((res) => setData(res?.data ?? null))
      .catch(() => setData(null));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const cancel = async (id: string) => {
    try {
      await PortalSdk.putData('/api/me/letters', { id, action: 'cancel' });
      toast.success('Request withdrawn');
      load();
    } catch (err) {
      toast.error(errorText(err, 'Could not withdraw it.'));
    }
  };

  if (!data || !data.companies.length) return null;
  const shown = data.requests.filter((r) => r.status !== 'CANCELLED');

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h3 className={cn('mr-auto text-sm font-semibold', t.title)}>
          Letters
        </h3>
        <button
          type="button"
          onClick={() => setAsking(true)}
          className={cn(
            'inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold',
            t.ghost,
          )}
        >
          <Icon name="add" className="text-[15px]" />
          Ask for a letter
        </button>
      </div>
      <div className={cn('overflow-hidden rounded-xl', t.card)}>
        {!shown.length ? (
          <p className={cn('p-4 text-sm', t.muted)}>
            Need an experience, relieving, salary or address letter? Ask here,
            and the signed letter comes to you.
          </p>
        ) : (
          <ul className={cn('divide-y', t.divide)}>
            {shown.map((r) => {
              const meta = LETTER_STATUS[r.status];
              return (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'flex flex-wrap items-center gap-2 text-sm font-medium',
                        t.title,
                      )}
                    >
                      <span className="truncate">{r.label}</span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          LETTER_TONES[theme][meta.tone],
                        )}
                      >
                        {meta.label}
                      </span>
                    </p>
                    <p className={cn('mt-0.5 truncate text-xs', t.muted)}>
                      {[
                        r.companyName,
                        r.purpose,
                        `asked ${day(r.requestedAt)}`,
                        r.status === 'SIGNING' &&
                          r.waitingOn &&
                          `waiting on ${r.waitingOn}’s signature`,
                        r.status === 'DECLINED' && r.declineReason,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {r.status === 'REQUESTED' && (
                      <button
                        type="button"
                        onClick={() => cancel(r.id)}
                        className={cn(
                          'inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold',
                          t.ghost,
                        )}
                      >
                        Withdraw
                      </button>
                    )}
                    {r.pdfUrl && (
                      <a
                        href={r.pdfUrl}
                        className={cn(
                          'inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold',
                          t.ghost,
                        )}
                      >
                        <Icon name="download" className="text-[15px]" />
                        PDF
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <RequestLetterDialog
        open={asking}
        onOpenChange={setAsking}
        data={data}
        onAsked={load}
        theme={theme}
      />
    </section>
  );
};

type DocFilter = 'all' | 'signed' | 'open' | 'company';

const FILTERS: Array<[DocFilter, string]> = [
  ['all', 'All'],
  ['signed', 'Signed'],
  ['open', 'In progress'],
  ['company', 'For the company'],
];

export const DocumentsPanel = ({ theme = 'dark' }: { theme?: Theme }) => {
  const t = THEMES[theme];
  const { data, approve, busy, setSignature } = useMyDocuments();
  const [editing, setEditing] = useState(false);
  const [filter, setFilter] = useState<DocFilter>('all');
  const [query, setQuery] = useState('');

  const rest = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.documents ?? []).filter(
      (d) =>
        d.status !== 'TO_SIGN' &&
        (filter === 'all' ||
          (filter === 'signed' && d.status === 'COMPLETED') ||
          (filter === 'open' &&
            (d.status === 'WAITING_OTHERS' || d.status === 'UP_NEXT')) ||
          (filter === 'company' && d.as === 'company')) &&
        (!q ||
          `${d.title} ${d.companyName} ${d.typeLabel} ${d.others.join(' ')}`
            .toLowerCase()
            .includes(q)),
    );
  }, [data, filter, query]);

  const remove = async () => {
    try {
      await PortalSdk.deleteData('/api/me/signature', null);
      setSignature(null);
      toast.success('Saved signature removed');
    } catch (err) {
      toast.error(errorText(err, 'Could not remove it.'));
    }
  };

  if (!data)
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn('h-16 animate-pulse rounded-xl', t.skeleton)}
          />
        ))}
      </div>
    );

  return (
    <div className="flex flex-col gap-8">
      {data.toSign.length > 0 && (
        <section>
          <h3 className={cn('mb-2 text-sm font-semibold', t.title)}>
            Waiting for you
          </h3>
          <div className={cn('overflow-hidden rounded-xl', t.card)}>
            <ToSignList
              docs={data.toSign}
              signature={data.signature}
              approve={approve}
              busy={busy}
              onSignature={setSignature}
              theme={theme}
            />
          </div>
        </section>
      )}

      <section>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className={cn('mr-auto text-sm font-semibold', t.title)}>
            Your documents
          </h3>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search your documents"
            className={cn(
              'h-8 w-40 rounded-lg border px-2.5 text-xs outline-none',
              t.input,
            )}
          />
          <div
            className={cn(
              'inline-flex rounded-lg p-0.5 text-xs font-medium',
              t.seg,
            )}
          >
            {FILTERS.map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setFilter(v)}
                className={cn(
                  'rounded-md px-2.5 py-1',
                  filter === v ? t.segOn : t.segOff,
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className={cn('overflow-hidden rounded-xl', t.card)}>
          {!rest.length ? (
            <p className={cn('p-4 text-sm', t.muted)}>
              {data.documents.length
                ? 'Nothing here.'
                : 'Documents you sign in the Portal, like your offer letter and NDA, show up here.'}
            </p>
          ) : (
            <ul className={cn('divide-y', t.divide)}>
              {rest.map((d) => (
                <li
                  key={`${d.ref}-${d.as}`}
                  className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'flex flex-wrap items-center gap-2 text-sm font-medium',
                        t.title,
                      )}
                    >
                      <span className="truncate">{d.title}</span>
                      <StatusChip status={d.status} theme={theme} />
                    </p>
                    <p className={cn('mt-0.5 truncate text-xs', t.muted)}>
                      {d.typeLabel} · {d.companyName}
                      {d.as === 'company'
                        ? ' · for the company'
                        : d.as === 'recipient'
                          ? ' · issued to you'
                          : ''}
                      {d.source === 'imported'
                        ? ' · signed outside the Portal'
                        : ''}
                      {d.signedAt
                        ? ` · signed ${day(d.signedAt)}`
                        : ` · sent ${day(d.sentAt)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {d.signUrl && d.status !== 'COMPLETED' && (
                      <Link
                        href={d.signUrl}
                        className={cn(
                          'inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold',
                          t.ghost,
                        )}
                      >
                        Open
                      </Link>
                    )}
                    {d.pdfUrl && (
                      <a
                        href={d.pdfUrl}
                        className={cn(
                          'inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold',
                          t.ghost,
                        )}
                      >
                        <Icon name="download" className="text-[15px]" />
                        PDF
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <LettersSection theme={theme} />

      <section>
        <h3 className={cn('mb-2 text-sm font-semibold', t.title)}>
          Your signature
        </h3>
        <div
          className={cn(
            'flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center',
            t.card,
          )}
        >
          <div className="min-w-0 flex-1">
            {data.signature ? (
              <div className="flex flex-col items-start gap-2">
                <SignatureMark signature={data.signature} />
                <p className={cn('text-xs', t.muted)}>
                  Saved {day(data.signature.updatedAt)}. Documents you approve
                  in the Portal get this signature, with the time and your IP
                  address in their audit trail.
                </p>
              </div>
            ) : (
              <p className={cn('text-sm', t.muted)}>
                No saved signature yet. Save one and you can approve documents
                with one click instead of signing each by hand.
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            {data.signature && (
              <button
                type="button"
                onClick={remove}
                className={cn(
                  'h-9 rounded-lg px-3 text-xs font-semibold',
                  t.ghost,
                )}
              >
                Remove
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={cn(
                'h-9 rounded-lg px-3 text-xs font-semibold',
                t.primary,
              )}
            >
              {data.signature ? 'Change' : 'Save a signature'}
            </button>
          </div>
        </div>
      </section>

      <SignatureDialog
        open={editing}
        onOpenChange={setEditing}
        current={data.signature}
        theme={theme}
        onSaved={setSignature}
      />
    </div>
  );
};
