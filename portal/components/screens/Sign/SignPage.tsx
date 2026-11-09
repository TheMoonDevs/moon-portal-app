'use client';

import { Caveat, Plus_Jakarta_Sans } from 'next/font/google';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { DocProse } from '@/components/shared/DocProse';
import { SignaturePad } from '@/components/shared/SignaturePad';
import type { SigningState } from '@/lib/agreements/server';
import { formatDay } from '@/lib/onboarding/meta';
import { cn } from '@/lib/utils';
import { AGREEMENT_STATUS, SIGNER_STATUS } from '@/models/agreements';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--sign-sans',
});
const hand = Caveat({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--sign-hand',
});

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

const Symbol = ({ name, className }: { name: string; className?: string }) => (
  <span
    aria-hidden
    className={cn('material-symbols-outlined leading-none', className)}
  >
    {name}
  </span>
);

const Shell = ({ children }: { children: ReactNode }) => (
  <div
    className={cn(
      sans.variable,
      hand.variable,
      'min-h-dvh bg-[#f6f4ef] text-zinc-800 [font-family:var(--sign-sans)] selection:bg-amber-200 print:bg-white',
    )}
  >
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pb-20 pt-6 sm:pt-10 print:max-w-none print:p-0">
      {children}
    </div>
  </div>
);

const Card = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <section
    className={cn(
      'rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.05)] ring-1 ring-black/[0.06] sm:p-6 print:shadow-none print:ring-0',
      className,
    )}
  >
    {children}
  </section>
);

const Button = ({
  children,
  tone = 'dark',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'dark' | 'light' | 'danger';
}) => (
  <button
    type="button"
    {...props}
    className={cn(
      'inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40',
      tone === 'dark' && 'bg-zinc-900 text-white hover:bg-zinc-800',
      tone === 'light' && 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200',
      tone === 'danger' && 'bg-rose-600 text-white hover:bg-rose-500',
      className,
    )}
  >
    {children}
  </button>
);

const fieldClass = (bad?: boolean) =>
  cn(
    'h-12 w-full rounded-xl border bg-white px-3.5 text-[15px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:ring-4',
    bad
      ? 'border-rose-300 focus:ring-rose-100'
      : 'border-zinc-200 focus:border-zinc-400 focus:ring-zinc-100',
  );

/* ------------------------------- signatures ------------------------------ */

type Signer = SigningState['signers'][number];

const SignatureMark = ({ signer }: { signer: Signer }) => {
  const sig = signer.signature!;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-16 items-end border-b border-zinc-300 pb-1">
        {sig.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sig.image}
            alt={`Signature of ${sig.name}`}
            className="h-16 w-auto object-contain object-left-bottom"
          />
        ) : (
          <span className="text-[34px] leading-none text-zinc-900 [font-family:var(--sign-hand)]">
            {sig.name}
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-zinc-900">{sig.name}</p>
      <p className="text-xs text-zinc-500">
        {signer.role ? `${signer.role} · ` : ''}Signed {when(sig.at)}
        {sig.saved ? ' · approved in the Portal' : ''}
      </p>
    </div>
  );
};

const STATUS_TEXT: Record<SIGNER_STATUS, string> = {
  [SIGNER_STATUS.WAITING]: 'Signs later',
  [SIGNER_STATUS.PENDING]: 'To sign',
  [SIGNER_STATUS.VIEWED]: 'Opened',
  [SIGNER_STATUS.SIGNED]: 'Signed',
  [SIGNER_STATUS.DECLINED]: 'Declined',
};

const Signers = ({ state }: { state: SigningState }) => (
  <Card className="print:break-inside-avoid">
    <h2 className="text-sm font-semibold text-zinc-900">
      {state.status === AGREEMENT_STATUS.COMPLETED
        ? 'Signatures'
        : `Who signs${state.ordered ? ', in this order' : ''}`}
    </h2>
    <ul className="mt-4 grid gap-6 sm:grid-cols-2">
      {state.signers.map((s) => (
        <li key={s.id}>
          {s.signature ? (
            <SignatureMark signer={s} />
          ) : (
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-full text-[18px]',
                  s.status === SIGNER_STATUS.DECLINED
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-zinc-100 text-zinc-500',
                )}
              >
                <Symbol
                  name={
                    s.status === SIGNER_STATUS.DECLINED
                      ? 'block'
                      : s.status === SIGNER_STATUS.WAITING
                        ? 'schedule'
                        : 'draw'
                  }
                />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {s.name}
                  {s.id === state.you.id && (
                    <span className="font-normal text-zinc-500"> (you)</span>
                  )}
                </p>
                <p className="text-xs text-zinc-500">
                  {s.role ? `${s.role} · ` : ''}
                  {STATUS_TEXT[s.status]}
                </p>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  </Card>
);

/** The record every signer keeps: who signed, when, from where, and the hash. */
const Certificate = ({ state }: { state: SigningState }) => (
  <Card className="print:break-before-page">
    <div className="flex items-center gap-2">
      <Symbol name="verified" className="text-[22px] text-emerald-600" />
      <h2 className="text-sm font-semibold text-zinc-900">
        Certificate of completion
      </h2>
    </div>
    <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[160px_1fr]">
      <dt className="text-zinc-500">Agreement</dt>
      <dd className="text-zinc-900">{state.title}</dd>
      <dt className="text-zinc-500">From</dt>
      <dd className="text-zinc-900">
        {state.companyName}, sent by {state.sender.name}
      </dd>
      <dt className="text-zinc-500">Sent</dt>
      <dd className="text-zinc-900">{when(state.sentAt)}</dd>
      {state.completedAt && (
        <>
          <dt className="text-zinc-500">Completed</dt>
          <dd className="text-zinc-900">{when(state.completedAt)}</dd>
        </>
      )}
      <dt className="text-zinc-500">Document fingerprint</dt>
      <dd className="break-all font-mono text-xs text-zinc-700">
        SHA-256 {state.hash}
      </dd>
    </dl>
    <table className="mt-5 w-full text-left text-xs">
      <thead className="text-zinc-500">
        <tr>
          <th className="py-2 pr-3 font-medium">Signer</th>
          <th className="py-2 pr-3 font-medium">Signed</th>
          <th className="py-2 font-medium">IP address</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100 text-zinc-700">
        {state.signers.map((s) => (
          <tr key={s.id}>
            <td className="py-2 pr-3">
              <span className="font-medium text-zinc-900">{s.name}</span>
              {s.email && <span className="block">{s.email}</span>}
            </td>
            <td className="py-2 pr-3">
              {s.signature
                ? `${when(s.signature.at)} (${s.signature.method})`
                : '—'}
            </td>
            <td className="py-2">{s.signature?.ip ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-500">
      Audit trail
    </h3>
    <ol className="mt-2 flex flex-col gap-1.5 text-xs text-zinc-700">
      {state.history.map((e, i) => (
        <li key={i} className="flex gap-3">
          <span className="w-36 shrink-0 text-zinc-500">{when(e.at)}</span>
          <span>
            {e.text}
            {e.ip ? <span className="text-zinc-400"> · {e.ip}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  </Card>
);

/* --------------------------------- signing ------------------------------- */

/** Signed in with a saved signature: one click, after reading it. */
const ApproveBox = ({
  state,
  onDone,
  onByHand,
}: {
  state: SigningState;
  onDone: (s: SigningState) => void;
  onByHand: () => void;
}) => {
  const saved = state.viewer.savedSignature!;
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Card className="flex flex-col gap-4 ring-amber-200/80 print:hidden">
      <div id="sign-here">
        <p className="text-base font-semibold text-zinc-900">
          {state.you.company
            ? `Approve for ${state.companyName}`
            : 'Approve and sign'}
        </p>
        <p className="mt-1 text-sm text-zinc-600">
          Your saved signature goes on it, as {state.you.name}
          {state.you.role ? `, ${state.you.role}` : ''}.
        </p>
      </div>
      <div className="flex h-16 items-end border-b border-zinc-300 pb-1">
        {saved.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={saved.image}
            alt="Your saved signature"
            className="h-16 w-auto object-contain object-left-bottom"
          />
        ) : (
          <span className="text-[38px] leading-none text-zinc-900 [font-family:var(--sign-hand)]">
            {saved.name}
          </span>
        )}
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-zinc-900"
        />
        I have read this agreement and agree to it
        {state.you.company ? ` on behalf of ${state.companyName}` : ''}. I agree
        that approving it here is the same as signing it by hand.
      </label>
      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
      <Button
        disabled={!agree || busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            onDone((await callSign(state.token, { action: 'approve' })).state);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
        className="w-full"
      >
        {busy ? 'Approving…' : 'Approve'}
        {!busy && <Symbol name="verified" className="text-[18px]" />}
      </Button>
      <button
        type="button"
        onClick={onByHand}
        className="self-center text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-800"
      >
        Sign by hand instead
      </button>
    </Card>
  );
};

const SignBox = ({
  state,
  onDone,
}: {
  state: SigningState;
  onDone: (s: SigningState) => void;
}) => {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'type' | 'draw'>('type');
  const [image, setImage] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  // Signed in as this signer: save it so the next one is one click.
  const [save, setSave] = useState(state.viewer.signedIn);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const matches = normalName(name) === normalName(state.you.name);
  const ready = matches && agree && (mode === 'type' || !!image);

  const run = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError('');
    try {
      const data = await callSign(state.token, body);
      onDone(data.state);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (declining)
    return (
      <Card className="flex flex-col gap-4 print:hidden">
        <p className="text-sm font-semibold text-zinc-900">Decline to sign</p>
        <p className="text-sm text-zinc-600">
          {state.sender.name} will be told, and nobody else can sign this
          agreement. If something just needs changing, say what, and they can
          send a corrected one.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Why, or what should change (optional)"
          className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-[15px] outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
        />
        {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            tone="danger"
            disabled={busy}
            onClick={() => run({ action: 'decline', reason })}
          >
            {busy ? 'Declining…' : 'Decline'}
          </Button>
          <Button tone="light" onClick={() => setDeclining(false)}>
            Back
          </Button>
        </div>
      </Card>
    );

  return (
    <Card className="flex flex-col gap-4 ring-amber-200/80 print:hidden">
      <div id="sign-here" className="flex items-center justify-between gap-3">
        <p className="text-base font-semibold text-zinc-900">
          Sign as {state.you.name}
        </p>
        <div className="inline-flex rounded-lg bg-zinc-100 p-1 text-xs font-semibold">
          {(['type', 'draw'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'rounded-md px-3 py-1.5',
                mode === m
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500',
              )}
            >
              {m === 'type' ? 'Type' : 'Draw'}
            </button>
          ))}
        </div>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-zinc-600">
          Type your full name:{' '}
          <strong className="text-zinc-900">{state.you.name}</strong>
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          className={fieldClass(!!name && !matches)}
        />
      </label>
      {mode === 'type' ? (
        <div className="flex h-16 items-end border-b border-zinc-300 pb-1">
          <span
            className={cn(
              'text-[38px] leading-none [font-family:var(--sign-hand)]',
              name ? 'text-zinc-900' : 'text-zinc-300',
            )}
          >
            {name || 'Your signature'}
          </span>
        </div>
      ) : (
        <SignaturePad onChange={setImage} />
      )}
      <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-zinc-900"
        />
        I have read this agreement and agree to it
        {state.you.company ? ` on behalf of ${state.companyName}` : ''}. I agree
        that signing it electronically is the same as signing it by hand.
      </label>
      {state.viewer.signedIn ? (
        <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={save}
            onChange={(e) => setSave(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-zinc-900"
          />
          <span>
            Save this signature to my Portal profile
            <span className="block text-xs text-zinc-500">
              Next time it&apos;s one click: an Approve button instead of
              signing again.
            </span>
          </span>
        </label>
      ) : (
        state.you.company && (
          <p className="text-xs text-zinc-500">
            Signing for the company often?{' '}
            <a
              href={`/login?uri=${encodeURIComponent(`/sign/${state.token}`)}`}
              className="font-medium text-zinc-800 underline underline-offset-2"
            >
              Sign in to the Portal
            </a>{' '}
            to save your signature, then approve the next ones in one click.
          </p>
        )
      )}
      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
      <Button
        disabled={!ready || busy}
        onClick={() =>
          run({
            action: 'sign',
            name,
            agree,
            hash: state.hash,
            image: mode === 'draw' ? image : null,
            save: state.viewer.signedIn && save,
          })
        }
        className="w-full"
      >
        {busy ? 'Signing…' : 'Sign the agreement'}
        {!busy && <Symbol name="signature" className="text-[18px]" />}
      </Button>
      <button
        type="button"
        onClick={() => setDeclining(true)}
        className="self-center text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-800"
      >
        I don&apos;t want to sign this
      </button>
    </Card>
  );
};

/* ---------------------------------- page --------------------------------- */

const Banner = ({ state }: { state: SigningState }) => {
  const you = state.you;
  const row = (icon: string, tone: string, title: string, body?: string) => (
    <div className={cn('flex items-start gap-3 rounded-2xl px-4 py-3.5', tone)}>
      <Symbol name={icon} className="mt-0.5 text-[22px]" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {body && <p className="mt-0.5 text-sm opacity-80">{body}</p>}
      </div>
    </div>
  );
  switch (state.status) {
    case AGREEMENT_STATUS.COMPLETED:
      return row(
        'task_alt',
        'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200',
        'Signed by everyone',
        'This is your signed copy. Download the PDF or come back to this link any time.',
      );
    case AGREEMENT_STATUS.DECLINED:
      return row(
        'block',
        'bg-rose-50 text-rose-900 ring-1 ring-rose-200',
        you.status === SIGNER_STATUS.DECLINED
          ? 'You declined to sign'
          : 'Someone declined to sign',
        'Nobody can sign this agreement now.',
      );
    case AGREEMENT_STATUS.VOIDED:
      return row(
        'cancel',
        'bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200',
        `${state.companyName} withdrew this agreement`,
        state.voidReason ?? 'It no longer needs your signature.',
      );
    case AGREEMENT_STATUS.EXPIRED:
      return row(
        'timer_off',
        'bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200',
        'The signing deadline has passed',
        `Ask ${state.sender.name} to send it again.`,
      );
    default:
      if (you.status === SIGNER_STATUS.SIGNED)
        return row(
          'task_alt',
          'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200',
          'You signed',
          `We'll email you the signed copy once ${state.signers
            .filter((s) => !s.signature)
            .map((s) => s.name)
            .join(
              ', ',
            )} sign${state.signers.filter((s) => !s.signature).length === 1 ? 's' : ''}.`,
        );
      if (!you.canSign)
        return row(
          'schedule',
          'bg-sky-50 text-sky-900 ring-1 ring-sky-200',
          `Waiting for ${you.waitingOn.join(', ')} to sign first`,
          'You can read it now. We will email you when it is your turn.',
        );
      return null;
  }
};

export const SignPage = ({ initial }: { initial: SigningState }) => {
  const [state, setState] = useState(initial);
  const [byHand, setByHand] = useState(false);

  const noteView = useCallback(() => {
    if (initial.you.canSign && initial.you.status !== SIGNER_STATUS.SIGNED)
      callSign(initial.token, { action: 'view' }).catch(() => {});
  }, [initial]);
  useEffect(noteView, [noteView]);

  const done = state.status === AGREEMENT_STATUS.COMPLETED;
  const showSign =
    state.status === AGREEMENT_STATUS.SENT &&
    state.you.canSign &&
    state.you.status !== SIGNER_STATUS.SIGNED;

  return (
    <Shell>
      <header className="flex items-center gap-3">
        {state.companyLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={state.companyLogo}
            alt=""
            className="size-10 rounded-xl object-cover"
          />
        ) : (
          <span className="flex size-10 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
            {state.companyName.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900">
            {state.companyName}
          </p>
          <p className="truncate text-xs text-zinc-500">
            Sent by {state.sender.name} · {when(state.sentAt)}
            {state.expiresOn && state.status === AGREEMENT_STATUS.SENT
              ? ` · sign by ${formatDay(state.expiresOn)}`
              : ''}
          </p>
        </div>
        {done && state.pdfUrl && (
          <a
            href={state.pdfUrl}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-semibold text-zinc-800 ring-1 ring-black/10 hover:bg-zinc-50 print:hidden"
          >
            <Symbol name="download" className="text-[18px]" />
            Download PDF
          </a>
        )}
        {showSign && (
          <button
            type="button"
            onClick={() =>
              document
                .getElementById('sign-here')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 text-xs font-semibold text-white print:hidden"
          >
            <Symbol name="signature" className="text-[18px]" />
            {state.viewer.savedSignature && !byHand ? 'Approve' : 'Sign'}
          </button>
        )}
      </header>

      <div className="print:hidden">
        <Banner state={state} />
      </div>

      {state.message && state.status === AGREEMENT_STATUS.SENT && (
        <Card className="print:hidden">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            A note from {state.sender.name}
          </p>
          <p className="mt-2 whitespace-pre-line text-[15px] text-zinc-700">
            {state.message}
          </p>
        </Card>
      )}

      <article className="rounded-md bg-white px-6 py-8 shadow-[0_1px_3px_rgba(0,0,0,.08),0_20px_40px_-20px_rgba(0,0,0,.25)] sm:p-12 print:p-0 print:shadow-none">
        <DocProse markdown={state.body} tone="paper" />
      </article>

      <Signers state={state} />

      {showSign &&
        (state.viewer.savedSignature && !byHand ? (
          <ApproveBox
            state={state}
            onDone={setState}
            onByHand={() => setByHand(true)}
          />
        ) : (
          <SignBox state={state} onDone={setState} />
        ))}

      {done && <Certificate state={state} />}

      <p className="text-center text-xs text-zinc-400 print:hidden">
        Questions? Write to {state.sender.name}
        {state.sender.email ? ` at ${state.sender.email}` : ''}. Signed through
        the Portal.
      </p>
    </Shell>
  );
};

export const SignLinkMissing = () => (
  <Shell>
    <Card className="mt-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950">
        This link doesn&apos;t open anything.
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-zinc-600">
        Check that you copied the whole link from your email. If it still
        doesn&apos;t work, reply to that email and ask for a new one.
      </p>
    </Card>
  </Shell>
);
