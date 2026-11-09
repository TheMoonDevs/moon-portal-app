'use client';

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { PdfPages } from '@/components/global/PdfPages';
import { signHand, signSans, signSerif } from '@/components/screens/Sign/fonts';
import { DocProse } from '@/components/shared/DocProse';
import { SignaturePad } from '@/components/shared/SignaturePad';
import { envelopeId, signatureMethod } from '@/lib/agreements/envelope';
import type { SigningState } from '@/lib/agreements/server';
import { formatDay } from '@/lib/onboarding/meta';
import { cn } from '@/lib/utils';
import { AGREEMENT_STATUS, SIGNER_STATUS } from '@/models/agreements';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';

/*
 * The page a signer opens from their email: the document on a sheet, who
 * signs and in what order, and the panel where they adopt a signature and
 * sign. Built to read like the signing tools large companies use: quiet
 * chrome, a clear next step, and the envelope's details always in view.
 */

/** Calls this signer's /api/sign/<token>. The link itself is the key. */
async function callSign(token: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/sign/${token}`, {
    method: 'PUT',
    headers: {
      tmd_portal_api_key: TMD_PORTAL_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data?.error || 'Something went wrong. Try again.');
  return data?.data;
}

const normalName = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

/** A Material Symbol. Its size comes from a text-[Npx] class, set inline
 * because the icon font's own stylesheet wins over the class. */
const Symbol = ({ name, className }: { name: string; className?: string }) => {
  const px = className?.match(/text-\[(\d+(?:\.\d+)?)px\]/)?.[1];
  return (
    <span
      aria-hidden
      className={cn('material-symbols-outlined leading-none', className)}
      style={px ? { fontSize: `${px}px` } : undefined}
    >
      {name}
    </span>
  );
};

/* ---------------------------------- chrome -------------------------------- */

const Shell = ({ children }: { children: ReactNode }) => (
  <div
    className={cn(
      signSans.variable,
      signSerif.variable,
      signHand.variable,
      'min-h-dvh bg-[#f1f3f6] text-slate-800 antialiased [font-family:var(--sign-sans)] selection:bg-blue-100 print:bg-white',
    )}
  >
    {children}
  </div>
);

const Panel = ({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) => (
  <section
    id={id}
    className={cn(
      'rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)] print:border-0 print:shadow-none',
      className,
    )}
  >
    {children}
  </section>
);

const PanelHead = ({
  title,
  hint,
  icon,
  right,
}: {
  title: string;
  hint?: ReactNode;
  icon?: string;
  right?: ReactNode;
}) => (
  <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
    {icon && (
      <Symbol name={icon} className="mt-px text-[20px] text-slate-500" />
    )}
    <div className="min-w-0 flex-1">
      <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
      {hint && <p className="mt-0.5 text-[13px] text-slate-500">{hint}</p>}
    </div>
    {right}
  </div>
);

const Button = ({
  children,
  tone = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'secondary' | 'danger' | 'inverse';
  size?: 'md' | 'lg';
}) => (
  <button
    type="button"
    {...props}
    className={cn(
      'inline-flex shrink-0 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 disabled:cursor-not-allowed disabled:opacity-45',
      size === 'lg' ? 'h-12 px-6 text-[15px]' : 'h-10',
      tone === 'primary' &&
        'bg-[#1d4ed8] text-white shadow-sm hover:bg-[#1e40af]',
      tone === 'secondary' &&
        'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
      tone === 'danger' && 'bg-rose-700 text-white hover:bg-rose-800',
      tone === 'inverse' &&
        'border border-white/25 bg-white/10 text-white hover:bg-white/20',
      className,
    )}
  >
    {children}
  </button>
);

const inputClass = (bad?: boolean) =>
  cn(
    'h-11 w-full rounded-md border bg-white px-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2',
    bad
      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
      : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/20',
  );

const areaClass =
  'w-full rounded-md border border-slate-300 bg-white p-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20';

const Label = ({
  children,
  required,
  optional,
}: {
  children: ReactNode;
  required?: boolean;
  optional?: boolean;
}) => (
  <span className="text-[13px] font-medium text-slate-700">
    {children}
    {required && <span className="text-rose-600"> *</span>}
    {optional && (
      <span className="font-normal text-slate-400"> (optional)</span>
    )}
  </span>
);

const Check = ({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) => (
  <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-700">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 size-[18px] shrink-0 rounded accent-[#1d4ed8]"
    />
    <span>{children}</span>
  </label>
);

/* ------------------------------- status bits ------------------------------ */

const SIGNER_CHIP: Record<
  SIGNER_STATUS,
  { label: string; icon: string; tone: string }
> = {
  [SIGNER_STATUS.SIGNED]: {
    label: 'Signed',
    icon: 'check_circle',
    tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  },
  [SIGNER_STATUS.PENDING]: {
    label: 'Needs to sign',
    icon: 'draw',
    tone: 'bg-blue-50 text-blue-800 ring-blue-200',
  },
  [SIGNER_STATUS.VIEWED]: {
    label: 'Viewed',
    icon: 'visibility',
    tone: 'bg-sky-50 text-sky-800 ring-sky-200',
  },
  [SIGNER_STATUS.WAITING]: {
    label: 'Waiting',
    icon: 'schedule',
    tone: 'bg-slate-100 text-slate-700 ring-slate-200',
  },
  [SIGNER_STATUS.DECLINED]: {
    label: 'Declined',
    icon: 'block',
    tone: 'bg-rose-50 text-rose-800 ring-rose-200',
  },
};

const Chip = ({
  icon,
  tone,
  children,
}: {
  icon?: string;
  tone: string;
  children: ReactNode;
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
      tone,
    )}
  >
    {icon && <Symbol name={icon} className="text-[13px]" />}
    {children}
  </span>
);

const envelopeChip = (state: SigningState) => {
  switch (state.status) {
    case AGREEMENT_STATUS.COMPLETED:
      return (
        <Chip icon="check_circle" tone={SIGNER_CHIP[SIGNER_STATUS.SIGNED].tone}>
          Completed
        </Chip>
      );
    case AGREEMENT_STATUS.DECLINED:
      return (
        <Chip icon="block" tone={SIGNER_CHIP[SIGNER_STATUS.DECLINED].tone}>
          Declined
        </Chip>
      );
    case AGREEMENT_STATUS.VOIDED:
      return (
        <Chip icon="cancel" tone={SIGNER_CHIP[SIGNER_STATUS.WAITING].tone}>
          Withdrawn
        </Chip>
      );
    case AGREEMENT_STATUS.EXPIRED:
      return (
        <Chip icon="timer_off" tone={SIGNER_CHIP[SIGNER_STATUS.WAITING].tone}>
          Expired
        </Chip>
      );
    default:
      return (
        <Chip icon="pending" tone="bg-amber-50 text-amber-800 ring-amber-200">
          Out for signature
        </Chip>
      );
  }
};

/** A signature in its frame, with the id that ties it to the audit trail. */
const SignatureFrame = ({
  name,
  image,
  signatureId,
  preview,
}: {
  name: string;
  image?: string | null;
  signatureId?: string | null;
  preview?: boolean;
}) => (
  <div className="relative inline-flex min-w-[230px] max-w-full flex-col py-1.5 pl-4 pr-3">
    <span
      aria-hidden
      className="absolute inset-y-0 left-0 w-4 rounded-l-md border-y-2 border-l-2 border-[#1d4ed8]"
    />
    <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
      Signed by:
    </span>
    <div className="flex h-14 items-end overflow-hidden">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={`Signature of ${name}`}
          className="h-14 w-auto object-contain object-left-bottom"
        />
      ) : (
        <span
          className={cn(
            'truncate text-[34px] leading-none [font-family:var(--sign-hand)]',
            name ? 'text-[#0b2a6b]' : 'text-slate-300',
          )}
        >
          {name || 'Your signature'}
        </span>
      )}
    </div>
    <span className="mt-1 font-mono text-[10px] tracking-wider text-slate-500">
      {signatureId ?? (preview ? 'Signature ID assigned when you sign' : ' ')}
    </span>
  </div>
);

/* ------------------------------ the document ------------------------------ */

/** The signature lines at the foot of the document. */
const SignatureLines = ({
  state,
  onSignHere,
}: {
  state: SigningState;
  onSignHere: () => void;
}) => (
  <div className="mt-12 border-t border-slate-200 pt-8 print:break-inside-avoid">
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 [font-family:var(--sign-sans)]">
      Signatures
    </p>
    <ul className="mt-6 grid gap-x-10 gap-y-9 [font-family:var(--sign-sans)] sm:grid-cols-2">
      {state.signers.map((s) => {
        const mine = s.id === state.you.id;
        const canSignHere =
          mine &&
          state.status === AGREEMENT_STATUS.SENT &&
          state.you.canSign &&
          !s.signature;
        return (
          <li key={s.id} className="flex min-w-0 flex-col">
            <div className="flex min-h-[92px] items-end">
              {s.signature ? (
                <SignatureFrame
                  name={s.signature.name}
                  image={s.signature.image}
                  signatureId={s.signature.signatureId}
                />
              ) : canSignHere ? (
                <button
                  type="button"
                  onClick={onSignHere}
                  className="group relative flex h-[76px] w-full max-w-[280px] items-center gap-2 rounded-md border-2 border-dashed border-[#1d4ed8]/60 bg-blue-50/70 px-4 text-left text-sm font-semibold text-[#1d4ed8] hover:bg-blue-50 print:hidden"
                >
                  <span className="absolute -left-1 -top-3 inline-flex items-center gap-1 rounded bg-[#1d4ed8] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    <Symbol name="arrow_downward" className="text-[12px]" />
                    Sign here
                  </span>
                  <Symbol name="draw" className="text-[20px]" />
                  {state.viewer.savedSignature ? 'Approve' : 'Sign'}
                </button>
              ) : (
                <div className="flex h-[76px] w-full max-w-[280px] items-center rounded-md border border-dashed border-slate-300 px-4 text-[13px] text-slate-400">
                  {s.status === SIGNER_STATUS.DECLINED
                    ? 'Declined to sign'
                    : 'Awaiting signature'}
                </div>
              )}
            </div>
            <div className="mt-2 border-t border-slate-900/80 pt-2">
              <p className="truncate text-sm font-semibold text-slate-900">
                {s.name}
                {mine && (
                  <span className="font-normal text-slate-500"> (you)</span>
                )}
              </p>
              <p className="truncate text-[12px] text-slate-500">
                {s.role || (s.company ? `For ${state.companyName}` : 'Signer')}
              </p>
              {s.signature && (
                <p className="text-[12px] text-slate-500">
                  {when(s.signature.at)}
                </p>
              )}
              {s.details.length > 0 && (
                <dl className="mt-3 grid gap-1.5 rounded-md border border-slate-200 bg-slate-50/70 p-3 text-[12px]">
                  {s.details.map((d) => (
                    <div
                      key={d.label}
                      className="grid grid-cols-[110px_1fr] gap-2"
                    >
                      <dt className="text-slate-500">{d.label}</dt>
                      <dd className="whitespace-pre-line break-words text-slate-900">
                        {d.text || '—'}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  </div>
);

const Sheet = ({
  state,
  onSignHere,
}: {
  state: SigningState;
  onSignHere: () => void;
}) => (
  <article className="overflow-hidden rounded-sm bg-white shadow-[0_1px_3px_rgba(15,23,42,.10),0_12px_32px_-12px_rgba(15,23,42,.22)] ring-1 ring-slate-900/[0.06] print:shadow-none print:ring-0">
    <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-3 text-[11px] text-slate-500 sm:px-14 print:px-0">
      <span className="truncate font-semibold uppercase tracking-[0.12em] text-slate-600">
        {state.companyName}
      </span>
      <span className="hidden shrink-0 font-mono tracking-wide sm:inline">
        Envelope ID {envelopeId(state.reference)}
      </span>
    </div>
    <div className="px-6 pb-12 pt-10 sm:px-14 sm:pb-16 sm:pt-14 print:px-0">
      <DocProse
        markdown={state.body}
        tone="paper"
        className="text-[16px] leading-[1.75] text-slate-800 [font-family:var(--sign-serif)] [&_h1]:mb-6 [&_h1]:text-[28px] [&_h1]:font-semibold [&_h1]:leading-tight [&_h1]:tracking-normal [&_h2]:mt-9 [&_h2]:text-[17px] [&_h3]:text-[15px] [&_li]:my-1.5"
      />
      <SignatureLines state={state} onSignHere={onSignHere} />
    </div>
  </article>
);

type Placement = SigningState['placements'][number];

const shortDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const BOX_LABEL: Record<Placement['kind'], string> = {
  signature: 'Sign here',
  initials: 'Initial',
  date: 'Date',
};

/** One box on an uploaded PDF: where someone signs, or what they signed. */
const PdfBox = ({
  box,
  state,
  onSignHere,
}: {
  box: Placement;
  state: SigningState;
  onSignHere: () => void;
}) => {
  const owner = state.signers.find((s) => s.id === box.signerId);
  const mine = box.signerId === state.you.id;
  const sig = owner?.signature;
  const pos = {
    left: `${box.x * 100}%`,
    top: `${box.y * 100}%`,
    width: `${box.w * 100}%`,
    height: `${box.h * 100}%`,
  };
  if (sig)
    return (
      <div
        className="absolute flex items-center overflow-hidden text-[#0b2a6b]"
        style={pos}
        title={`${owner!.name} · ${when(sig.at)}`}
      >
        {box.kind === 'signature' ? (
          sig.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sig.image}
              alt={`Signature of ${sig.name}`}
              className="max-h-full max-w-full object-contain object-left"
            />
          ) : (
            <span className="truncate text-[clamp(12px,2.4vw,26px)] leading-none [font-family:var(--sign-hand)]">
              {sig.name}
            </span>
          )
        ) : box.kind === 'initials' ? (
          <span className="mx-auto text-[clamp(11px,2vw,20px)] leading-none [font-family:var(--sign-hand)]">
            {sig.initials}
          </span>
        ) : (
          <span className="truncate text-[clamp(8px,1.2vw,12px)] text-slate-800">
            {shortDay(sig.at)}
          </span>
        )}
      </div>
    );
  const canSign =
    mine &&
    state.status === AGREEMENT_STATUS.SENT &&
    state.you.canSign &&
    state.you.status !== SIGNER_STATUS.SIGNED;
  if (canSign)
    return (
      <button
        type="button"
        id={`box-${box.id}`}
        data-mine-box
        onClick={onSignHere}
        className="absolute flex scroll-mt-40 items-center justify-center gap-1 overflow-visible rounded-[3px] border-[1.5px] border-[#1d4ed8] bg-[#fde68a]/80 text-[clamp(8px,1.1vw,11px)] font-bold uppercase tracking-wide text-[#1e3a8a] shadow-sm hover:bg-[#fcd34d] print:hidden"
        style={pos}
      >
        {box.kind === 'signature' && (
          <Symbol name="signature" className="text-[14px]" />
        )}
        <span className="truncate">{BOX_LABEL[box.kind]}</span>
      </button>
    );
  return (
    <div
      className="absolute flex items-center overflow-hidden rounded-[3px] border border-dashed border-slate-400/80 bg-slate-100/60 px-1 text-[clamp(7px,1vw,10px)] font-medium text-slate-500 print:hidden"
      style={pos}
      title={owner ? `${owner.name} signs here` : undefined}
    >
      <span className="truncate">
        {box.kind === 'signature'
          ? (owner?.name ?? 'Signer')
          : box.kind === 'initials'
            ? 'Initials'
            : 'Date'}
      </span>
    </div>
  );
};

/** An uploaded PDF, page by page, with everyone's boxes on it. */
const PdfSheet = ({
  state,
  onSignHere,
}: {
  state: SigningState;
  onSignHere: () => void;
}) => {
  const doc = state.document!;
  const mine = state.placements.filter((p) => p.signerId === state.you.id);
  const open =
    state.status === AGREEMENT_STATUS.SENT &&
    state.you.canSign &&
    state.you.status !== SIGNER_STATUS.SIGNED &&
    mine.length > 0;
  const [next, setNext] = useState(0);
  const pages = Array.from(new Set(mine.map((p) => p.page + 1))).sort(
    (a, b) => a - b,
  );

  const goNext = () => {
    const list = Array.from(
      document.querySelectorAll<HTMLElement>('[data-mine-box]'),
    );
    if (!list.length) return onSignHere();
    const el = list[next % list.length];
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.animate?.(
      [
        { boxShadow: '0 0 0 0 rgba(29,78,216,.6)' },
        { boxShadow: '0 0 0 10px rgba(29,78,216,0)' },
      ],
      { duration: 900 },
    );
    setNext((n) => n + 1);
  };

  return (
    // Not overflow-hidden: the "places for you" bar sticks while scrolling.
    <article className="rounded-sm bg-white shadow-[0_1px_3px_rgba(15,23,42,.10),0_12px_32px_-12px_rgba(15,23,42,.22)] ring-1 ring-slate-900/[0.06] print:shadow-none print:ring-0">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 text-[11px] text-slate-500 sm:px-6">
        <span className="flex min-w-0 items-center gap-2">
          <Symbol name="picture_as_pdf" className="text-[18px] text-rose-700" />
          <span className="truncate font-semibold text-slate-700">
            {doc.fileName}
          </span>
          <span className="shrink-0">
            · {doc.pages.length} {doc.pages.length === 1 ? 'page' : 'pages'}
          </span>
        </span>
        <span className="hidden shrink-0 font-mono tracking-wide sm:inline">
          Envelope ID {envelopeId(state.reference)}
        </span>
      </div>
      {open && (
        <div className="sticky top-[64px] z-20 flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900 sm:px-6 print:hidden">
          <Symbol name="info" className="text-[18px] text-amber-600" />
          <span className="min-w-0 flex-1">
            {mine.length} {mine.length === 1 ? 'place' : 'places'} for you on{' '}
            {pages.length === 1 ? 'page' : 'pages'} {pages.join(', ')}. They
            fill in when you sign.
          </span>
          <button
            type="button"
            onClick={goNext}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-[#1d4ed8] px-3 text-[12px] font-semibold text-white hover:bg-[#1e40af]"
          >
            {next ? 'Next' : 'Start'}
            <Symbol name="arrow_downward" className="text-[15px]" />
          </button>
        </div>
      )}
      <div className="bg-[#e7eaee] px-3 py-5 sm:p-8 print:bg-white print:p-0">
        <PdfPages
          source={{ url: doc.url }}
          pages={doc.pages}
          pageClassName="shadow-[0_2px_10px_rgba(15,23,42,.18)] ring-0"
          overlay={(page) =>
            state.placements
              .filter((p) => p.page === page)
              .map((p) => (
                <PdfBox
                  key={p.id}
                  box={p}
                  state={state}
                  onSignHere={onSignHere}
                />
              ))
          }
        />
      </div>
      <div className="px-6 pb-10 sm:px-14">
        <SignatureLines state={state} onSignHere={onSignHere} />
      </div>
    </article>
  );
};

/* ------------------------------- email code ------------------------------ */

/** Asks for the code emailed to the signer before the document opens. */
const VerifyGate = ({
  state,
  onOpened,
}: {
  state: SigningState;
  onOpened: (s: SigningState) => void;
}) => {
  const locked = state.locked!;
  const recent =
    !!locked.codeSentAt &&
    Date.now() - new Date(locked.codeSentAt).getTime() < 10 * 60_000;
  const [sentTo, setSentTo] = useState<string | null>(
    recent ? locked.email : null,
  );
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'send' | 'check' | null>(null);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const send = async () => {
    setBusy('send');
    setError('');
    try {
      const res = await callSign(state.token, { action: 'sendCode' });
      setSentTo(res.sentTo);
      setCode('');
      requestAnimationFrame(() => input.current?.focus());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const check = async (value: string) => {
    setBusy('check');
    setError('');
    try {
      const res = await callSign(state.token, {
        action: 'checkCode',
        code: value,
      });
      onOpened(res.state);
    } catch (err) {
      setError((err as Error).message);
      setCode('');
      input.current?.focus();
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[500px] px-4 py-10 sm:py-16">
      <Panel>
        <div className="flex flex-col gap-5 px-6 py-8 sm:px-9">
          <span className="flex size-12 items-center justify-center rounded-full bg-blue-50 ring-1 ring-blue-100">
            <Symbol name="shield_lock" className="text-[24px] text-[#1d4ed8]" />
          </span>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
              Verify it&apos;s you
            </h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-slate-600">
              {state.companyName} asked for an extra check before{' '}
              <span className="font-medium text-slate-900">
                “{state.title}”
              </span>{' '}
              opens. We&apos;ll email a 6-digit code to{' '}
              <span className="font-medium text-slate-900">{locked.email}</span>
              .
            </p>
          </div>
          {!sentTo ? (
            <Button
              size="lg"
              onClick={send}
              disabled={busy === 'send'}
              className="w-full"
            >
              <Symbol name="mail" className="text-[20px]" />
              {busy === 'send' ? 'Sending…' : 'Email me a code'}
            </Button>
          ) : (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (code.length === 6) check(code);
              }}
            >
              <label className="flex flex-col gap-1.5">
                <Label>Code sent to {sentTo}</Label>
                <input
                  ref={input}
                  value={code}
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label="6-digit code"
                  placeholder="000000"
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setCode(v);
                    if (v.length === 6 && busy !== 'check') check(v);
                  }}
                  className={cn(
                    inputClass(!!error),
                    'h-14 text-center font-mono text-[26px] tracking-[0.5em]',
                  )}
                />
              </label>
              <Button
                size="lg"
                type="submit"
                disabled={code.length !== 6 || busy === 'check'}
                className="w-full"
              >
                {busy === 'check' ? 'Checking…' : 'Continue'}
              </Button>
              <p className="text-center text-[13px] text-slate-500">
                No email? Check spam, or{' '}
                <button
                  type="button"
                  onClick={send}
                  disabled={busy === 'send'}
                  className="font-medium text-[#1d4ed8] hover:underline"
                >
                  send a new code
                </button>
                .
              </p>
            </form>
          )}
          {error && <ErrorNote text={error} />}
          <p className="border-t border-slate-100 pt-4 text-[12.5px] leading-relaxed text-slate-500">
            The code works for 10 minutes. Have a Portal account with this
            email?{' '}
            <a
              href={`/login?uri=${encodeURIComponent(`/sign/${state.token}`)}`}
              className="font-medium text-[#1d4ed8] underline underline-offset-2"
            >
              Sign in
            </a>{' '}
            instead and you skip this step.
          </p>
        </div>
      </Panel>
      <p className="mt-4 text-center font-mono text-[11px] tracking-wide text-slate-500">
        Envelope ID {envelopeId(state.reference)}
      </p>
    </main>
  );
};

/* --------------------------------- sidebar -------------------------------- */

const CopyId = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          },
          () => {},
        );
      }}
      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1d4ed8] hover:underline print:hidden"
    >
      <Symbol
        name={copied ? 'check' : 'content_copy'}
        className="text-[13px]"
      />
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
};

const Fact = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
      {label}
    </dt>
    <dd className="text-[13px] text-slate-900">{children}</dd>
  </div>
);

const DetailsCard = ({ state }: { state: SigningState }) => {
  const id = envelopeId(state.reference);
  return (
    <Panel>
      <PanelHead title="Envelope details" icon="description" />
      <dl className="flex flex-col gap-3.5 px-5 py-4">
        <Fact label="Document">{state.title}</Fact>
        <Fact label="Status">{envelopeChip(state)}</Fact>
        <Fact label="From">
          {state.companyName}
          <span className="block text-slate-500">
            {state.sender.name}
            {state.sender.email ? ` · ${state.sender.email}` : ''}
          </span>
        </Fact>
        <Fact label="Sent">{when(state.sentAt)}</Fact>
        {state.expiresOn && state.status === AGREEMENT_STATUS.SENT && (
          <Fact label="Sign by">{formatDay(state.expiresOn)}</Fact>
        )}
        {state.completedAt && (
          <Fact label="Completed">{when(state.completedAt)}</Fact>
        )}
        <Fact label="Envelope ID">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="break-all font-mono text-[12px]">{id}</span>
            <CopyId value={id} />
          </span>
        </Fact>
      </dl>
    </Panel>
  );
};

const RecipientsCard = ({ state }: { state: SigningState }) => (
  <Panel>
    <PanelHead
      title="Recipients"
      icon="group"
      hint={
        state.signers.length < 2
          ? undefined
          : state.ordered
            ? 'They sign in this order.'
            : 'They can sign in any order.'
      }
    />
    <ol className="flex flex-col divide-y divide-slate-100">
      {state.signers.map((s, i) => {
        const chip = SIGNER_CHIP[s.status];
        return (
          <li key={s.id} className="flex items-start gap-3 px-5 py-3.5">
            <span className="relative">
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-full text-[12px] font-semibold',
                  s.company
                    ? 'bg-[#0f1f38] text-white'
                    : 'bg-slate-100 text-slate-700',
                )}
              >
                {initials(s.name)}
              </span>
              {state.ordered && (
                <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-slate-600 ring-1 ring-slate-300">
                  {i + 1}
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-slate-900">
                {s.name}
                {s.id === state.you.id && (
                  <span className="font-normal text-slate-500"> (you)</span>
                )}
              </p>
              <p className="truncate text-[12px] text-slate-500">
                {s.role || (s.company ? `For ${state.companyName}` : 'Signer')}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Chip icon={chip.icon} tone={chip.tone}>
                  {chip.label}
                </Chip>
                {s.signature && (
                  <span className="text-[11px] text-slate-500">
                    {when(s.signature.at)}
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  </Panel>
);

const SecurityCard = ({ state }: { state: SigningState }) => (
  <Panel>
    <PanelHead title="Security" icon="verified_user" />
    <ul className="flex flex-col gap-3 px-5 py-4 text-[12.5px] leading-relaxed text-slate-600">
      <li className="flex gap-2.5">
        <Symbol name="key" className="mt-0.5 text-[16px] text-slate-400" />
        This link is yours alone. Please don&apos;t forward it.
      </li>
      <li className="flex gap-2.5">
        <Symbol name="history" className="mt-0.5 text-[16px] text-slate-400" />
        Every view and signature is recorded with its time and IP address.
      </li>
      {state.emailCode && (
        <li className="flex gap-2.5">
          <Symbol
            name="shield_lock"
            className="mt-0.5 text-[16px] text-slate-400"
          />
          Each signer confirms a code sent to their email before it opens.
        </li>
      )}
      <li className="flex gap-2.5">
        <Symbol
          name="fingerprint"
          className="mt-0.5 text-[16px] text-slate-400"
        />
        <span className="min-w-0">
          {state.document
            ? 'Fingerprint of the original PDF (SHA-256)'
            : 'Document fingerprint (SHA-256)'}
          <span
            className="block truncate font-mono text-[11px] text-slate-500"
            title={state.hash}
          >
            {state.hash}
          </span>
        </span>
      </li>
    </ul>
  </Panel>
);

/* --------------------------------- signing -------------------------------- */

type Values = Record<string, string>;
type FieldSpec = SigningState['you']['fields'][number];

/** What's still to fill in before signing, or null when it's all there. */
const stillToFill = (fields: FieldSpec[], values: Values) => {
  const f = fields.find((x) => x.required && !values[x.id]?.trim());
  return f
    ? f.kind === 'checkbox'
      ? `Tick “${f.label}”.`
      : `Fill in ${f.label}.`
    : null;
};

const Step = ({
  n,
  title,
  hint,
  done,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  done?: boolean;
  children: ReactNode;
}) => (
  <div className="flex gap-4 p-5 sm:px-6">
    <span
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
        done ? 'bg-emerald-600 text-white' : 'bg-[#0f1f38] text-white',
      )}
    >
      {done ? <Symbol name="check" className="text-[16px]" /> : n}
    </span>
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <div>
        <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
        {hint && <p className="mt-0.5 text-[13px] text-slate-500">{hint}</p>}
      </div>
      {children}
    </div>
  </div>
);

/** The details this signer fills in, before they sign. */
const FieldsForm = ({
  fields,
  values,
  onChange,
}: {
  fields: FieldSpec[];
  values: Values;
  onChange: (v: Values) => void;
}) => {
  const set = (id: string, v: string) => onChange({ ...values, [id]: v });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) =>
        f.kind === 'checkbox' ? (
          <div key={f.id} className="sm:col-span-2">
            <Check
              checked={values[f.id] === 'yes'}
              onChange={(v) => set(f.id, v ? 'yes' : '')}
            >
              {f.label}
              {!f.required && (
                <span className="text-slate-400"> (optional)</span>
              )}
              {f.hint && (
                <span className="block text-[12px] text-slate-500">
                  {f.hint}
                </span>
              )}
            </Check>
          </div>
        ) : (
          <label
            key={f.id}
            className={cn(
              'flex flex-col gap-1.5',
              f.kind === 'longtext' && 'sm:col-span-2',
            )}
          >
            <Label required={f.required} optional={!f.required}>
              {f.label}
            </Label>
            {f.kind === 'longtext' ? (
              <textarea
                value={values[f.id] ?? ''}
                onChange={(e) => set(f.id, e.target.value)}
                rows={3}
                className={areaClass}
              />
            ) : (
              <input
                type={f.kind === 'date' ? 'date' : 'text'}
                value={values[f.id] ?? ''}
                onChange={(e) => set(f.id, e.target.value)}
                className={inputClass()}
              />
            )}
            {f.hint && (
              <span className="text-[12px] text-slate-500">{f.hint}</span>
            )}
          </label>
        ),
      )}
    </div>
  );
};

const consentText = (state: SigningState, approve?: boolean) => (
  <>
    I have read this document and agree to it
    {state.you.company ? ` on behalf of ${state.companyName}` : ''}. I agree
    that {approve ? 'approving it here' : 'my electronic signature'} is the same
    as signing it by hand.
  </>
);

const PanelFoot = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:px-6">
    {children}
  </div>
);

const ErrorNote = ({ text }: { text: string }) => (
  <p
    role="alert"
    className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] font-medium text-rose-800"
  >
    <Symbol name="error" className="text-[16px]" />
    {text}
  </p>
);

const SecondaryLinks = ({
  onHandOver,
  onDecline,
  extra,
}: {
  onHandOver: () => void;
  onDecline: () => void;
  extra?: ReactNode;
}) => (
  <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px]">
    {extra}
    <button
      type="button"
      onClick={onHandOver}
      className="font-medium text-slate-600 hover:text-slate-900 hover:underline"
    >
      Assign to someone else
    </button>
    <button
      type="button"
      onClick={onDecline}
      className="font-medium text-slate-600 hover:text-rose-700 hover:underline"
    >
      Decline to sign
    </button>
  </div>
);

const SignBox = ({
  state,
  onDone,
  onHandOver,
  onDecline,
}: {
  state: SigningState;
  onDone: (s: SigningState) => void;
  onHandOver: () => void;
  onDecline: () => void;
}) => {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'type' | 'draw'>('type');
  const [image, setImage] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  // Signed in as this signer: save it so the next one is one click.
  const [save, setSave] = useState(state.viewer.signedIn);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<Values>(state.you.values ?? {});
  // Initials, for initials boxes on an uploaded PDF: from the name unless
  // they type their own.
  const [ownInitials, setOwnInitials] = useState<string | null>(null);
  const wantsInitials = state.you.initialsBoxes > 0;
  const fromName = name
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').charAt(0))
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 4);
  const myInitials = (ownInitials ?? fromName).trim();
  const fields = state.you.fields;
  const toFill = stillToFill(fields, values);
  const matches = normalName(name) === normalName(state.you.name);
  const adopted =
    matches && (mode === 'type' || !!image) && (!wantsInitials || !!myInitials);
  const ready = adopted && agree && !toFill;
  let n = 0;

  const sign = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await callSign(state.token, {
        action: 'sign',
        name,
        agree,
        hash: state.hash,
        image: mode === 'draw' ? image : null,
        save: state.viewer.signedIn && save,
        values,
        initials: wantsInitials ? myInitials : undefined,
      });
      onDone(data.state);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel id="sign-here" className="scroll-mt-28 print:hidden">
      <PanelHead
        title={`Sign as ${state.you.name}`}
        hint={
          state.you.role
            ? `${state.you.role}${state.you.company ? ` · for ${state.companyName}` : ''}`
            : state.you.company
              ? `For ${state.companyName}`
              : undefined
        }
        icon="signature"
      />
      <div className="divide-y divide-slate-100">
        {fields.length > 0 && (
          <Step
            n={++n}
            title="Fill in your details"
            hint="Saved with your signature and printed in the signed copy."
            done={!toFill}
          >
            <FieldsForm fields={fields} values={values} onChange={setValues} />
          </Step>
        )}
        <Step
          n={++n}
          title="Adopt your signature"
          hint="Confirm your full name, then type or draw your signature."
          done={adopted}
        >
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="flex flex-col gap-1.5">
              <Label required>
                Full name{' '}
                <span className="font-normal text-slate-500">
                  (as written: {state.you.name})
                </span>
              </Label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className={inputClass(!!name && !matches)}
              />
            </label>
            <div
              role="tablist"
              aria-label="Signature style"
              className="inline-flex h-11 rounded-md border border-slate-300 bg-white p-1 text-[13px] font-semibold"
            >
              {(['type', 'draw'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded px-3',
                    mode === m
                      ? 'bg-[#0f1f38] text-white'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  <Symbol
                    name={m === 'type' ? 'keyboard' : 'gesture'}
                    className="text-[16px]"
                  />
                  {m === 'type' ? 'Type' : 'Draw'}
                </button>
              ))}
            </div>
          </div>
          {name && !matches && (
            <p className="text-[12px] text-rose-700">
              Type your name exactly as it appears: {state.you.name}.
            </p>
          )}
          {mode === 'type' ? (
            <div className="rounded-md border border-slate-200 bg-slate-50/60 px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Preview
              </p>
              <SignatureFrame name={name} preview />
            </div>
          ) : (
            <SignaturePad onChange={setImage} />
          )}
          {wantsInitials && (
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex w-32 flex-col gap-1.5">
                <Label required>Initials</Label>
                <input
                  value={ownInitials ?? fromName}
                  onChange={(e) =>
                    setOwnInitials(e.target.value.toUpperCase().slice(0, 4))
                  }
                  className={cn(inputClass(), 'uppercase')}
                />
              </label>
              <span className="pb-2 text-[30px] leading-none text-[#0b2a6b] [font-family:var(--sign-hand)]">
                {myInitials || ' '}
              </span>
              <p className="basis-full text-[12px] text-slate-500">
                Goes in the {state.you.initialsBoxes} initials{' '}
                {state.you.initialsBoxes === 1 ? 'box' : 'boxes'} on the
                document.
              </p>
            </div>
          )}
        </Step>
        <Step n={++n} title="Confirm and sign" done={ready}>
          <Check checked={agree} onChange={setAgree}>
            {consentText(state)}
          </Check>
          {state.viewer.signedIn ? (
            <Check checked={save} onChange={setSave}>
              Save this signature to my Portal profile
              <span className="block text-[12px] text-slate-500">
                Next time it&apos;s one click: an Approve button instead of
                signing again.
              </span>
            </Check>
          ) : (
            state.you.company && (
              <p className="text-[12px] text-slate-500">
                Signing for the company often?{' '}
                <a
                  href={`/login?uri=${encodeURIComponent(`/sign/${state.token}`)}`}
                  className="font-medium text-[#1d4ed8] underline underline-offset-2"
                >
                  Sign in to the Portal
                </a>{' '}
                to save your signature, then approve the next ones in one click.
              </p>
            )
          )}
        </Step>
      </div>
      <PanelFoot>
        {(error || (agree && adopted && toFill)) && (
          <ErrorNote text={error || toFill!} />
        )}
        <Button
          size="lg"
          disabled={!ready || busy}
          onClick={sign}
          className="w-full"
        >
          {!busy && <Symbol name="signature" className="text-[20px]" />}
          {busy ? 'Signing…' : 'Sign the document'}
        </Button>
        <SecondaryLinks onHandOver={onHandOver} onDecline={onDecline} />
      </PanelFoot>
    </Panel>
  );
};

/** Signed in with a saved signature: one click, after reading it. */
const ApproveBox = ({
  state,
  onDone,
  onByHand,
  onHandOver,
  onDecline,
}: {
  state: SigningState;
  onDone: (s: SigningState) => void;
  onByHand: () => void;
  onHandOver: () => void;
  onDecline: () => void;
}) => {
  const saved = state.viewer.savedSignature!;
  const [agree, setAgree] = useState(false);
  const [values, setValues] = useState<Values>(state.you.values ?? {});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fields = state.you.fields;
  const toFill = stillToFill(fields, values);
  let n = 0;
  return (
    <Panel id="sign-here" className="scroll-mt-28 print:hidden">
      <PanelHead
        title={
          state.you.company
            ? `Approve for ${state.companyName}`
            : 'Approve and sign'
        }
        hint={`Your saved signature goes on it, as ${state.you.name}${state.you.role ? `, ${state.you.role}` : ''}.`}
        icon="approval"
      />
      <div className="divide-y divide-slate-100">
        {fields.length > 0 && (
          <Step n={++n} title="Fill in your details" done={!toFill}>
            <FieldsForm fields={fields} values={values} onChange={setValues} />
          </Step>
        )}
        <Step n={++n} title="Your saved signature" done>
          <div className="rounded-md border border-slate-200 bg-slate-50/60 px-4 py-3">
            <SignatureFrame name={saved.name} image={saved.image} preview />
          </div>
        </Step>
        <Step n={++n} title="Confirm and approve" done={agree && !toFill}>
          <Check checked={agree} onChange={setAgree}>
            {consentText(state, true)}
          </Check>
        </Step>
      </div>
      <PanelFoot>
        {(error || (agree && toFill)) && <ErrorNote text={error || toFill!} />}
        <Button
          size="lg"
          disabled={!agree || busy || !!toFill}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              onDone(
                (await callSign(state.token, { action: 'approve', values }))
                  .state,
              );
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="w-full"
        >
          {!busy && <Symbol name="verified" className="text-[20px]" />}
          {busy ? 'Approving…' : 'Approve'}
        </Button>
        <SecondaryLinks
          onHandOver={onHandOver}
          onDecline={onDecline}
          extra={
            <button
              type="button"
              onClick={onByHand}
              className="font-medium text-slate-600 hover:text-slate-900 hover:underline"
            >
              Sign by hand instead
            </button>
          }
        />
      </PanelFoot>
    </Panel>
  );
};

/** Not the right person: pass it to a colleague, who gets their own link. */
const HandOverBox = ({
  state,
  onBack,
  onDone,
}: {
  state: SigningState;
  onBack: () => void;
  onDone: (to: string) => void;
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  return (
    <Panel id="sign-here" className="scroll-mt-28 print:hidden">
      <PanelHead
        title="Assign to someone else"
        icon="forward_to_inbox"
        hint={
          <>
            They get their own link by email and sign in your place
            {state.you.role ? `, as ${state.you.role}` : ''}. Your link stops
            working, and {state.sender.name} is told.
          </>
        }
      />
      <div className="grid gap-4 p-5 sm:grid-cols-2 sm:px-6">
        <label className="flex flex-col gap-1.5">
          <Label required>Their full legal name</Label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass()}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <Label required>Their email</Label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass()}
          />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <Label optional>Reason</Label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. I'm away this week"
            className={areaClass}
          />
        </label>
      </div>
      <PanelFoot>
        {error && <ErrorNote text={error} />}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button tone="secondary" onClick={onBack}>
            Back
          </Button>
          <Button
            disabled={!ok || busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                const data = await callSign(state.token, {
                  action: 'handover',
                  name,
                  email,
                  reason,
                });
                onDone(data?.handedOver?.to ?? name);
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Assigning…' : 'Assign'}
          </Button>
        </div>
      </PanelFoot>
    </Panel>
  );
};

const DeclineBox = ({
  state,
  onBack,
  onDone,
}: {
  state: SigningState;
  onBack: () => void;
  onDone: (s: SigningState) => void;
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Panel id="sign-here" className="scroll-mt-28 print:hidden">
      <PanelHead
        title="Decline to sign"
        icon="block"
        hint={`${state.sender.name} will be told, and nobody else can sign this document. If something just needs changing, say what, and they can send a corrected one.`}
      />
      <div className="p-5 sm:px-6">
        <label className="flex flex-col gap-1.5">
          <Label optional>Reason</Label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Why, or what should change"
            className={areaClass}
          />
        </label>
      </div>
      <PanelFoot>
        {error && <ErrorNote text={error} />}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button tone="secondary" onClick={onBack}>
            Back
          </Button>
          <Button
            tone="danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                onDone(
                  (await callSign(state.token, { action: 'decline', reason }))
                    .state,
                );
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Declining…' : 'Decline'}
          </Button>
        </div>
      </PanelFoot>
    </Panel>
  );
};

/* ------------------------------- certificate ------------------------------ */

/** The record every signer keeps: who signed, when, from where, and the hash. */
const Certificate = ({ state }: { state: SigningState }) => (
  <Panel className="overflow-hidden print:break-before-page">
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-[#0f1f38] px-5 py-4 text-white sm:px-6">
      <Symbol
        name="workspace_premium"
        className="text-[24px] text-emerald-300"
      />
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-semibold">Certificate of completion</h2>
        <p className="text-[12px] text-white/60">
          How this document was sent and signed. It is part of the signed PDF.
        </p>
      </div>
      <Chip
        icon="check_circle"
        tone="bg-emerald-400/15 text-emerald-200 ring-emerald-300/30"
      >
        Completed
      </Chip>
    </div>
    <dl className="grid gap-x-8 gap-y-3.5 p-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
      <Fact label="Envelope ID">
        <span className="break-all font-mono text-[12px]">
          {envelopeId(state.reference)}
        </span>
      </Fact>
      <Fact label="Document">{state.title}</Fact>
      <Fact label="Originator">
        {state.sender.name}
        {state.sender.email && (
          <span className="block text-slate-500">{state.sender.email}</span>
        )}
      </Fact>
      <Fact label="Sent">{when(state.sentAt)}</Fact>
      {state.completedAt && (
        <Fact label="Completed">{when(state.completedAt)}</Fact>
      )}
      <Fact label="Signatures">
        {state.signers.filter((s) => s.signature).length} of{' '}
        {state.signers.length}
      </Fact>
      <div className="sm:col-span-2 lg:col-span-3">
        <Fact label="Document fingerprint (SHA-256)">
          <span className="break-all font-mono text-[12px] text-slate-700">
            {state.hash}
          </span>
        </Fact>
      </div>
    </dl>
    <div className="border-t border-slate-200">
      <h3 className="px-5 pt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:px-6">
        Signer events
      </h3>
      <div className="overflow-x-auto px-5 pb-2 sm:px-6">
        <table className="mt-2 w-full min-w-[560px] text-left text-[12.5px]">
          <thead className="border-b border-slate-200 text-[11px] uppercase tracking-[0.06em] text-slate-500">
            <tr>
              <th className="py-2 pr-4 font-semibold">Signer</th>
              <th className="py-2 pr-4 font-semibold">Signature</th>
              <th className="py-2 font-semibold">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 align-top text-slate-700">
            {state.signers.map((s) => (
              <tr key={s.id}>
                <td className="py-3 pr-4">
                  <span className="font-semibold text-slate-900">{s.name}</span>
                  {s.email && <span className="block">{s.email}</span>}
                  <span className="block text-slate-500">
                    {s.role ||
                      (s.company ? `For ${state.companyName}` : 'Signer')}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {s.signature ? (
                    <>
                      <SignatureFrame
                        name={s.signature.name}
                        image={s.signature.image}
                        signatureId={s.signature.signatureId}
                      />
                      <span className="mt-1 block text-[11.5px] text-slate-500">
                        {signatureMethod(s.signature)}
                        {s.signature.ip ? ` · IP ${s.signature.ip}` : ''}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400">
                      {s.status === SIGNER_STATUS.DECLINED
                        ? 'Declined'
                        : 'Not signed'}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap py-3">
                  {s.signature ? `Signed ${when(s.signature.at)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    <div className="border-t border-slate-200 pb-4">
      <h3 className="px-5 pt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:px-6">
        Audit trail
      </h3>
      <ol className="mt-2 flex flex-col px-5 text-[12.5px] text-slate-700 sm:px-6">
        {state.history.map((e, i) => (
          <li
            key={i}
            className="grid gap-x-4 border-b border-slate-100 py-2 last:border-0 sm:grid-cols-[170px_1fr_auto]"
          >
            <span className="text-slate-500">{when(e.at)}</span>
            <span>{e.text}</span>
            <span className="font-mono text-[11px] text-slate-400">
              {e.ip ?? ''}
            </span>
          </li>
        ))}
      </ol>
    </div>
  </Panel>
);

/* ---------------------------------- page ---------------------------------- */

type Mode = 'sign' | 'handover' | 'decline';

const TopBar = ({ state }: { state: SigningState }) => (
  <header className="border-b border-slate-200 bg-white print:hidden">
    <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center gap-3 px-4 sm:px-6">
      {state.companyLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={state.companyLogo}
          alt=""
          className="size-9 rounded-md object-cover"
        />
      ) : (
        <span className="flex size-9 items-center justify-center rounded-md bg-[#0f1f38] text-sm font-bold text-white">
          {state.companyName.slice(0, 1)}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-slate-900">
          {state.companyName}
        </p>
        <p className="truncate text-[12px] text-slate-500">Document signing</p>
      </div>
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <span className="hidden items-center gap-1.5 text-[12px] font-medium text-slate-600 md:inline-flex">
          <Symbol name="lock" className="text-[16px] text-emerald-600" />
          Secure, encrypted connection
        </span>
        <span className="hidden h-6 w-px bg-slate-200 md:block" />
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-100"
        >
          <Symbol name="print" className="text-[18px]" />
          <span className="hidden sm:inline">Print</span>
        </button>
      </div>
    </div>
  </header>
);

/** Other actions, under the main button. */
const MoreMenu = ({
  items,
}: {
  items: Array<{ label: string; icon: string; onClick: () => void }>;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <Button
        tone="inverse"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="px-3"
      >
        <span className="hidden sm:inline">Other actions</span>
        <Symbol name="expand_more" className="text-[18px]" />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-40 w-60 overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-slate-800 shadow-xl"
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
              className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-[13px] font-medium hover:bg-slate-50"
            >
              <Symbol name={it.icon} className="text-[18px] text-slate-500" />
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ActionBar = ({
  tone,
  icon,
  title,
  body,
  children,
}: {
  tone: 'navy' | 'success' | 'danger' | 'neutral';
  icon: string;
  title: string;
  body?: string | null;
  children?: ReactNode;
}) => (
  <div
    className={cn(
      'sticky top-0 z-30 border-b print:hidden',
      tone === 'navy' && 'border-[#0b1729] bg-[#0f1f38] text-white',
      tone === 'success' && 'border-emerald-800 bg-emerald-700 text-white',
      tone === 'danger' && 'border-rose-900 bg-rose-800 text-white',
      tone === 'neutral' && 'border-slate-700 bg-slate-700 text-white',
    )}
  >
    <div className="mx-auto flex w-full max-w-[1240px] items-center gap-3 px-4 py-3 sm:px-6">
      <Symbol name={icon} className="hidden text-[22px] opacity-80 sm:block" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold leading-snug">{title}</p>
        {body && (
          <p className="hidden text-[12.5px] leading-snug text-white/70 sm:line-clamp-2">
            {body}
          </p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      )}
    </div>
  </div>
);

const Notice = ({
  icon,
  tone,
  title,
  body,
}: {
  icon: string;
  tone: 'amber' | 'blue';
  title: string;
  body?: string;
}) => (
  <div
    className={cn(
      'flex items-start gap-3 rounded-md border border-l-4 bg-white px-4 py-3 print:hidden',
      tone === 'amber'
        ? 'border-amber-200 border-l-amber-500'
        : 'border-blue-200 border-l-[#1d4ed8]',
    )}
  >
    <Symbol
      name={icon}
      className={cn(
        'mt-0.5 text-[20px]',
        tone === 'amber' ? 'text-amber-600' : 'text-[#1d4ed8]',
      )}
    />
    <div>
      <p className="text-[14px] font-semibold text-slate-900">{title}</p>
      {body && <p className="mt-0.5 text-[13px] text-slate-600">{body}</p>}
    </div>
  </div>
);

export const SignPage = ({ initial }: { initial: SigningState }) => {
  const [state, setState] = useState(initial);
  const [byHand, setByHand] = useState(false);
  const [mode, setMode] = useState<Mode>('sign');
  const [handedTo, setHandedTo] = useState<string | null>(null);

  const noteView = useCallback(() => {
    if (initial.you.canSign && initial.you.status !== SIGNER_STATUS.SIGNED)
      callSign(initial.token, { action: 'view' }).catch(() => {});
  }, [initial]);
  useEffect(noteView, [noteView]);

  const you = state.you;
  const done = state.status === AGREEMENT_STATUS.COMPLETED;
  const showSign =
    !handedTo &&
    state.status === AGREEMENT_STATUS.SENT &&
    you.canSign &&
    you.status !== SIGNER_STATUS.SIGNED;
  const approving = !!state.viewer.savedSignature && !byHand;

  const toPanel = (m: Mode = 'sign') => {
    setMode(m);
    requestAnimationFrame(() =>
      document
        .getElementById('sign-here')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };

  const stillOut = state.signers.filter((s) => !s.signature).map((s) => s.name);

  const bar = (() => {
    if (handedTo)
      return (
        <ActionBar
          tone="navy"
          icon="forward_to_inbox"
          title={`Assigned to ${handedTo}`}
          body="They have their own link by email. This link no longer signs."
        />
      );
    switch (state.status) {
      case AGREEMENT_STATUS.COMPLETED:
        return (
          <ActionBar
            tone="success"
            icon="task_alt"
            title="Completed. Everyone has signed."
            body="This is your copy. Download the PDF, or come back to this link at any time."
          >
            {state.pdfUrl && (
              <a
                href={state.pdfUrl}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
              >
                <Symbol name="download" className="text-[18px]" />
                <span className="hidden sm:inline">Download PDF</span>
                <span className="sm:hidden">PDF</span>
              </a>
            )}
          </ActionBar>
        );
      case AGREEMENT_STATUS.DECLINED:
        return (
          <ActionBar
            tone="danger"
            icon="block"
            title={
              you.status === SIGNER_STATUS.DECLINED
                ? 'You declined to sign'
                : 'A signer declined to sign'
            }
            body="This document can no longer be signed."
          />
        );
      case AGREEMENT_STATUS.VOIDED:
        return (
          <ActionBar
            tone="neutral"
            icon="cancel"
            title={`${state.companyName} withdrew this document`}
            body={state.voidReason ?? 'It no longer needs your signature.'}
          />
        );
      case AGREEMENT_STATUS.EXPIRED:
        return (
          <ActionBar
            tone="neutral"
            icon="timer_off"
            title="The signing deadline has passed"
            body={`Ask ${state.sender.name} to send it again.`}
          />
        );
    }
    if (you.status === SIGNER_STATUS.SIGNED)
      return (
        <ActionBar
          tone="navy"
          icon="task_alt"
          title="You've signed"
          body={`We'll email you the completed copy once ${stillOut.join(', ')} sign${stillOut.length === 1 ? 's' : ''}.`}
        />
      );
    if (!you.canSign)
      return (
        <ActionBar
          tone="navy"
          icon="schedule"
          title={`Waiting for ${you.waitingOn.join(', ')} to sign first`}
          body="You can review the document now. We'll email you when it's your turn."
        />
      );
    return (
      <ActionBar
        tone="navy"
        icon="draw"
        title={
          approving
            ? `Review the document, then approve it for ${state.companyName}.`
            : 'Please review the document below, then sign.'
        }
        body={
          state.expiresOn
            ? `Requested by ${state.sender.name}. Sign by ${formatDay(state.expiresOn)}.`
            : `Requested by ${state.sender.name}.`
        }
      >
        <MoreMenu
          items={[
            {
              label: 'Assign to someone else',
              icon: 'forward_to_inbox',
              onClick: () => toPanel('handover'),
            },
            {
              label: 'Decline to sign',
              icon: 'block',
              onClick: () => toPanel('decline'),
            },
            ...(state.document
              ? [
                  {
                    label: 'Download the original PDF',
                    icon: 'download',
                    onClick: () => {
                      window.location.href = `${state.document!.url}?download=1`;
                    },
                  },
                ]
              : []),
            { label: 'Print', icon: 'print', onClick: () => window.print() },
          ]}
        />
        <Button onClick={() => toPanel('sign')} className="px-5">
          {approving ? 'Approve' : 'Sign'}
        </Button>
      </ActionBar>
    );
  })();

  if (state.locked)
    return (
      <Shell>
        <TopBar state={state} />
        <ActionBar
          tone="navy"
          icon="shield_lock"
          title="Verify it's you to open this document"
          body={`Sent by ${state.sender.name} for ${state.companyName}.`}
        />
        <VerifyGate
          state={state}
          onOpened={(s) => {
            setState(s);
            if (s.you.canSign && s.you.status !== SIGNER_STATUS.SIGNED)
              callSign(s.token, { action: 'view' }).catch(() => {});
          }}
        />
      </Shell>
    );

  return (
    <Shell>
      <TopBar state={state} />
      {bar}
      <main className="mx-auto grid w-full max-w-[1240px] gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_320px] print:block print:p-0">
        <div className="flex min-w-0 flex-col gap-5">
          {showSign && state.correctedAt && (
            <Notice
              icon="edit_document"
              tone="amber"
              title={`${state.sender.name} corrected this document on ${when(state.correctedAt)}`}
              body="Any earlier signatures were cleared. Please read it again before you sign."
            />
          )}
          {showSign && you.handedOverFrom && (
            <Notice
              icon="forward_to_inbox"
              tone="blue"
              title={`${you.handedOverFrom.name} assigned this document to you`}
              body="You sign in their place."
            />
          )}
          {state.message && state.status === AGREEMENT_STATUS.SENT && (
            <Panel className="print:hidden">
              <div className="flex gap-3 px-5 py-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-semibold text-slate-700">
                  {initials(state.sender.name)}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] text-slate-500">
                    <span className="font-semibold text-slate-900">
                      {state.sender.name}
                    </span>{' '}
                    sent a message
                  </p>
                  <p className="mt-1.5 whitespace-pre-line text-[14.5px] leading-relaxed text-slate-700">
                    {state.message}
                  </p>
                </div>
              </div>
            </Panel>
          )}

          {state.document ? (
            <PdfSheet state={state} onSignHere={() => toPanel('sign')} />
          ) : (
            <Sheet state={state} onSignHere={() => toPanel('sign')} />
          )}

          {showSign &&
            (mode === 'handover' ? (
              <HandOverBox
                state={state}
                onBack={() => toPanel('sign')}
                onDone={setHandedTo}
              />
            ) : mode === 'decline' ? (
              <DeclineBox
                state={state}
                onBack={() => toPanel('sign')}
                onDone={setState}
              />
            ) : approving ? (
              <ApproveBox
                state={state}
                onDone={setState}
                onByHand={() => setByHand(true)}
                onHandOver={() => toPanel('handover')}
                onDecline={() => toPanel('decline')}
              />
            ) : (
              <SignBox
                state={state}
                onDone={setState}
                onHandOver={() => toPanel('handover')}
                onDecline={() => toPanel('decline')}
              />
            ))}

          {done && <Certificate state={state} />}
        </div>

        <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-24 lg:self-start print:hidden">
          <DetailsCard state={state} />
          <RecipientsCard state={state} />
          <SecurityCard state={state} />
        </aside>
      </main>

      <footer className="border-t border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-1 px-4 py-5 text-[12px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Questions about this document? Contact {state.sender.name}
            {state.sender.email ? ` at ${state.sender.email}` : ''}.
          </p>
          <p>
            Signed electronically in the Portal · Envelope ID{' '}
            {envelopeId(state.reference)}
          </p>
        </div>
      </footer>
    </Shell>
  );
};

export const SignLinkMissing = () => (
  <Shell>
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center gap-2 px-4 text-[15px] font-semibold text-slate-900 sm:px-6">
        <Symbol name="lock" className="text-[18px] text-slate-500" />
        Document signing
      </div>
    </header>
    <main className="mx-auto w-full max-w-lg px-4 py-16">
      <Panel className="px-6 py-8 text-center sm:px-10">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100">
          <Symbol name="link_off" className="text-[24px] text-slate-500" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">
          This signing link isn&apos;t valid
        </h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-slate-600">
          Check that you copied the whole link from your email. If it still
          doesn&apos;t open, reply to that email and ask for a new one.
        </p>
      </Panel>
    </main>
  </Shell>
);
