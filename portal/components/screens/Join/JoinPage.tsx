'use client';

import { Caveat, Plus_Jakarta_Sans } from 'next/font/google';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { DocProse } from '@/components/shared/DocProse';
import type { JoinState } from '@/lib/onboarding/join';
import { formatDay, HIRE_TYPE_LABEL, STEPS } from '@/lib/onboarding/meta';
import { cn } from '@/lib/utils';
import { ONBOARDING_STEP } from '@/models/onboarding';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--join-sans',
});
const hand = Caveat({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--join-hand',
});

type JoinDoc = JoinState['toSign'][number];
type Errors = Record<string, string>;

class JoinError extends Error {
  errors: Errors;
  constructor(message: string, errors: Errors = {}) {
    super(message);
    this.errors = errors;
  }
}

/** Calls this hire's /api/join/<token>. The link itself is the key. */
async function callJoin(
  token: string,
  method: 'POST' | 'PUT',
  body: BodyInit,
  json = true,
) {
  const res = await fetch(`/api/join/${token}`, {
    method,
    headers: {
      tmd_portal_api_key: TMD_PORTAL_API_KEY,
      ...(json ? { 'Content-Type': 'application/json' } : {}),
    },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new JoinError(
      data?.error || 'Something went wrong. Try again.',
      data?.errors,
    );
  return data?.data;
}

const normalName = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

const Symbol = ({ name, className }: { name: string; className?: string }) => (
  <span
    aria-hidden
    className={cn('material-symbols-outlined leading-none', className)}
  >
    {name}
  </span>
);

/* --------------------------------- shell --------------------------------- */

const Shell = ({ children }: { children: ReactNode }) => (
  <div
    className={cn(
      sans.variable,
      hand.variable,
      'min-h-dvh bg-[#f6f4ef] text-zinc-800 [font-family:var(--join-sans)] selection:bg-amber-200',
    )}
  >
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-20 pt-6 sm:pt-10">
      {children}
    </div>
  </div>
);

const Header = ({ state }: { state: JoinState }) => (
  <header className="flex items-center gap-3">
    {state.companyLogo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={state.companyLogo}
        alt=""
        className="size-10 rounded-xl object-cover ring-1 ring-black/5"
      />
    ) : (
      <span className="flex size-10 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
        {state.companyName.slice(0, 1)}
      </span>
    )}
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-zinc-900">
        {state.companyName}
      </p>
      <p className="truncate text-xs text-zinc-500">
        {state.role ? `${state.role}` : 'Joining the team'}
        {state.hireType ? ` · ${HIRE_TYPE_LABEL[state.hireType]}` : ''}
      </p>
    </div>
  </header>
);

const Stepper = ({ step }: { step: ONBOARDING_STEP }) => {
  if (step === ONBOARDING_STEP.ENDED) return null;
  const at = STEPS.findIndex((s) => s.step === step);
  return (
    <ol className="flex items-center gap-1.5" aria-label="Your steps">
      {STEPS.map((s, i) => (
        <li key={s.step} className="flex flex-1 flex-col gap-1.5">
          <span
            className={cn(
              'h-1.5 rounded-full transition-colors',
              i < at
                ? 'bg-emerald-500'
                : i === at
                  ? 'bg-zinc-900'
                  : 'bg-zinc-300/70',
            )}
          />
          <span
            className={cn(
              'hidden text-[11px] font-medium sm:block',
              i === at
                ? 'text-zinc-900'
                : i < at
                  ? 'text-emerald-700'
                  : 'text-zinc-400',
            )}
          >
            {s.label}
          </span>
        </li>
      ))}
    </ol>
  );
};

const Card = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <section
    className={cn(
      'rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_-12px_rgba(0,0,0,.12)] ring-1 ring-black/[0.04] sm:p-7',
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
  tone?: 'dark' | 'light';
}) => (
  <button
    type="button"
    {...props}
    className={cn(
      'inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40',
      tone === 'dark'
        ? 'bg-zinc-900 text-white hover:bg-zinc-800'
        : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200',
      className,
    )}
  >
    {children}
  </button>
);

const LinkButton = ({
  href,
  children,
  tone = 'dark',
}: {
  href: string;
  children: ReactNode;
  tone?: 'dark' | 'light';
}) => (
  <a
    href={href}
    className={cn(
      'inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition active:scale-[.98]',
      tone === 'dark'
        ? 'bg-zinc-900 text-white hover:bg-zinc-800'
        : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200',
    )}
  >
    {children}
  </a>
);

const ContactCard = ({ state }: { state: JoinState }) => (
  <div className="flex items-start gap-3 rounded-2xl border border-zinc-200/80 bg-white/60 p-4">
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
      <Symbol name="support_agent" className="text-[20px]" />
    </span>
    <div className="min-w-0 text-sm">
      <p className="text-zinc-500">
        Questions? Ask{' '}
        {state.contact.role ? `your ${state.contact.role.toLowerCase()}` : ''}
      </p>
      <p className="font-semibold text-zinc-900">{state.contact.name}</p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-zinc-600">
        {state.contact.email && (
          <a
            href={`mailto:${state.contact.email}`}
            className="underline-offset-2 hover:underline"
          >
            {state.contact.email}
          </a>
        )}
        {state.contact.phone && (
          <a
            href={`tel:${state.contact.phone.replace(/\s/g, '')}`}
            className="underline-offset-2 hover:underline"
          >
            {state.contact.phone}
          </a>
        )}
      </div>
    </div>
  </div>
);

/* ------------------------------ details form ----------------------------- */

const Input = ({
  label,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) => (
  <label className="flex flex-col gap-1.5">
    <span className="flex items-baseline justify-between gap-2 text-sm font-medium text-zinc-800">
      {label}
      {optional && (
        <span className="text-xs font-normal text-zinc-400">Optional</span>
      )}
    </span>
    {children}
    {error ? (
      <span className="text-xs font-medium text-rose-600">{error}</span>
    ) : hint ? (
      <span className="text-xs text-zinc-500">{hint}</span>
    ) : null}
  </label>
);

const fieldClass = (error?: string) =>
  cn(
    'h-12 w-full rounded-xl border bg-white px-3.5 text-[15px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:ring-4',
    error
      ? 'border-rose-300 focus:ring-rose-100'
      : 'border-zinc-200 focus:border-zinc-400 focus:ring-zinc-100',
  );

const timezones = (): string[] => {
  try {
    return (
      Intl as unknown as { supportedValuesOf: (k: string) => string[] }
    ).supportedValuesOf('timeZone');
  } catch {
    return [
      'Asia/Kolkata',
      'UTC',
      'Europe/London',
      'America/New_York',
      'Asia/Dubai',
      'Asia/Singapore',
    ];
  }
};

const DetailsForm = ({
  state,
  onDone,
}: {
  state: JoinState;
  onDone: (s: JoinState) => void;
}) => {
  const [form, setForm] = useState({
    legalName: state.name,
    preferredName: '',
    signInEmail: state.email,
    phone: '',
    dateOfBirth: '',
    address: '',
    city: '',
    country: 'India',
    timezone: 'Asia/Kolkata',
    linkedin: '',
    portfolio: '',
    emergencyName: '',
    emergencyPhone: '',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const zones = useMemo(timezones, []);
  const preview = useMemo(
    () => (photo ? URL.createObjectURL(photo) : null),
    [photo],
  );

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) setForm((f) => ({ ...f, timezone: tz }));
  }, []);
  useEffect(
    () => () => void (preview && URL.revokeObjectURL(preview)),
    [preview],
  );

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest);
    };

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
      return setErrors((e) => ({
        ...e,
        photo: 'Use a PNG, JPG or WebP photo.',
      }));
    if (file.size > 5 * 1024 * 1024)
      return setErrors((e) => ({ ...e, photo: 'Photos can be up to 5 MB.' }));
    setPhoto(file);
    setErrors(({ photo: _, ...rest }) => rest);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) {
      setErrors((x) => ({ ...x, photo: 'Add a profile photo.' }));
      setMessage('Please add a profile photo.');
      return;
    }
    setSending(true);
    setMessage('');
    try {
      const body = new FormData();
      body.set('payload', JSON.stringify(form));
      body.set('photo', photo);
      const data = await callJoin(state.token, 'POST', body, false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      onDone(data.state);
    } catch (err) {
      const e2 = err as JoinError;
      setErrors(e2.errors ?? {});
      setMessage(e2.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <Card className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl">
            Welcome aboard, {state.firstName}.
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-zinc-600">
            First, a few details to set up your portal account. It takes about
            three minutes. Next come your Trial Policy and NDA to sign, then
            your sign-in.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pick(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              'group relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed transition',
              errors.photo
                ? 'border-rose-300 bg-rose-50'
                : 'border-zinc-300 bg-zinc-50 hover:border-zinc-500',
              preview && 'border-solid border-white ring-2 ring-zinc-900/10',
            )}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Your photo"
                className="size-full object-cover"
              />
            ) : (
              <Symbol
                name="add_a_photo"
                className="text-[28px] text-zinc-400 group-hover:text-zinc-700"
              />
            )}
          </button>
          <div className="text-sm">
            <p className="font-semibold text-zinc-900">Profile photo</p>
            <p
              className={cn(
                'mt-0.5',
                errors.photo ? 'text-rose-600' : 'text-zinc-500',
              )}
            >
              {errors.photo ||
                'A clear photo of your face. Your teammates see it next to your work.'}
            </p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-1.5 text-sm font-semibold text-zinc-900 underline underline-offset-4"
            >
              {photo ? 'Choose another' : 'Choose a photo'}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </div>
      </Card>

      <Card className="grid gap-5 sm:grid-cols-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 sm:col-span-2">
          About you
        </h2>
        <div className="sm:col-span-2">
          <Input
            label="Full legal name"
            hint="As on your ID. You sign your agreements with it."
            error={errors.legalName}
          >
            <input
              value={form.legalName}
              onChange={set('legalName')}
              autoComplete="name"
              className={fieldClass(errors.legalName)}
            />
          </Input>
        </div>
        <Input label="What should we call you?" optional>
          <input
            value={form.preferredName}
            onChange={set('preferredName')}
            placeholder={state.firstName}
            className={fieldClass()}
          />
        </Input>
        <Input label="Date of birth" optional>
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={set('dateOfBirth')}
            className={fieldClass()}
          />
        </Input>
        <div className="sm:col-span-2">
          <Input
            label="Google account for signing in"
            hint="You sign in to the portal with Google. Use the account you'll work from."
            error={errors.signInEmail}
          >
            <input
              type="email"
              value={form.signInEmail}
              onChange={set('signInEmail')}
              autoComplete="email"
              className={fieldClass(errors.signInEmail)}
            />
          </Input>
        </div>
        <Input label="Phone" hint="With country code" error={errors.phone}>
          <input
            type="tel"
            value={form.phone}
            onChange={set('phone')}
            placeholder="+91 98765 43210"
            autoComplete="tel"
            className={fieldClass(errors.phone)}
          />
        </Input>
        <Input label="Timezone" error={errors.timezone}>
          <select
            value={form.timezone}
            onChange={set('timezone')}
            className={fieldClass(errors.timezone)}
          >
            {!zones.includes(form.timezone) && (
              <option value={form.timezone}>{form.timezone}</option>
            )}
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </Input>
        <Input label="City" error={errors.city}>
          <input
            value={form.city}
            onChange={set('city')}
            autoComplete="address-level2"
            className={fieldClass(errors.city)}
          />
        </Input>
        <Input label="Country" error={errors.country}>
          <input
            value={form.country}
            onChange={set('country')}
            autoComplete="country-name"
            className={fieldClass(errors.country)}
          />
        </Input>
        <div className="sm:col-span-2">
          <Input label="Address" hint="Goes on your agreements." optional>
            <input
              value={form.address}
              onChange={set('address')}
              autoComplete="street-address"
              className={fieldClass()}
            />
          </Input>
        </div>
      </Card>

      <Card className="grid gap-5 sm:grid-cols-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 sm:col-span-2">
          Links and an emergency contact
        </h2>
        <Input label="LinkedIn" optional>
          <input
            value={form.linkedin}
            onChange={set('linkedin')}
            placeholder="https://linkedin.com/in/…"
            className={fieldClass()}
          />
        </Input>
        <Input label="Portfolio or GitHub" optional>
          <input
            value={form.portfolio}
            onChange={set('portfolio')}
            placeholder="https://…"
            className={fieldClass()}
          />
        </Input>
        <Input label="Emergency contact" optional>
          <input
            value={form.emergencyName}
            onChange={set('emergencyName')}
            placeholder="Name and relation"
            className={fieldClass()}
          />
        </Input>
        <Input label="Their phone" optional>
          <input
            type="tel"
            value={form.emergencyPhone}
            onChange={set('emergencyPhone')}
            className={fieldClass()}
          />
        </Input>
      </Card>

      <div className="sticky bottom-4 z-10 flex flex-col gap-2">
        {message && (
          <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
            {message}
          </p>
        )}
        <Button
          type="submit"
          disabled={sending}
          className="w-full shadow-lg shadow-zinc-900/10"
        >
          {sending ? 'Setting up your account…' : 'Send my details'}
          {!sending && <Symbol name="arrow_forward" className="text-[18px]" />}
        </Button>
      </div>
    </form>
  );
};

/* -------------------------------- signing -------------------------------- */

const SignedMark = ({ name, at }: { name: string; at: string }) => (
  <div className="flex items-end justify-between gap-4 border-t border-dashed border-zinc-200 pt-4">
    <div>
      <p className="text-[34px] leading-none text-zinc-900 [font-family:var(--join-hand)]">
        {name}
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Signed{' '}
        {new Date(at).toLocaleString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}
      </p>
    </div>
    <Symbol name="verified" className="text-[28px] text-emerald-600" />
  </div>
);

const DocReader = ({
  state,
  doc,
  onClose,
  onSigned,
}: {
  state: JoinState;
  doc: JoinDoc;
  onClose: () => void;
  onSigned: (s: JoinState) => void;
}) => {
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const matches =
    !!state.legalName && normalName(name) === normalName(state.legalName);

  useEffect(() => {
    if (!doc.signature)
      callJoin(
        state.token,
        'PUT',
        JSON.stringify({ action: 'view', docId: doc.id }),
      ).catch(() => {});
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [doc.id, doc.signature, state.token]);

  const sign = async () => {
    setSending(true);
    setError('');
    try {
      const data = await callJoin(
        state.token,
        'PUT',
        JSON.stringify({ action: 'sign', docId: doc.id, name, agree }),
      );
      onSigned(data.state);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#ecebe6]"
      role="dialog"
      aria-modal
      aria-label={doc.title}
    >
      <div className="flex items-center gap-3 border-b border-black/5 bg-[#f6f4ef]/90 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="flex size-10 items-center justify-center rounded-full hover:bg-black/5"
        >
          <Symbol name="arrow_back" className="text-[22px]" />
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">
          {doc.title}
        </p>
        {!doc.signature && (
          <button
            type="button"
            onClick={() =>
              document
                .getElementById('sign-here')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
            className="rounded-full bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white"
          >
            Sign
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-6 sm:px-6">
        <article className="mx-auto max-w-[720px] rounded-md bg-white px-6 py-8 shadow-[0_1px_3px_rgba(0,0,0,.08),0_20px_40px_-20px_rgba(0,0,0,.25)] sm:p-12">
          <DocProse markdown={doc.body} tone="paper" />
          <div id="sign-here" className="mt-10">
            {doc.signature ? (
              <SignedMark name={doc.signature.name} at={doc.signature.at} />
            ) : (
              <div className="flex flex-col gap-4 rounded-xl bg-amber-50/60 p-4 ring-1 ring-amber-200/70 sm:p-5">
                <p className="text-sm font-semibold text-zinc-900">
                  Sign this document
                </p>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-zinc-600">
                    Type your full legal name:{' '}
                    <strong className="text-zinc-900">{state.legalName}</strong>
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="off"
                    className={fieldClass(name && !matches ? 'x' : undefined)}
                  />
                </label>
                <div className="flex h-14 items-end border-b border-zinc-300 pb-1">
                  <span
                    className={cn(
                      'text-[34px] leading-none [font-family:var(--join-hand)]',
                      name ? 'text-zinc-900' : 'text-zinc-300',
                    )}
                  >
                    {name || 'Your signature'}
                  </span>
                </div>
                <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="mt-0.5 size-5 shrink-0 accent-zinc-900"
                  />
                  I have read this document and I agree to it. Typing my name
                  counts as my signature.
                </label>
                {error && (
                  <p className="text-sm font-medium text-rose-600">{error}</p>
                )}
                <Button
                  onClick={sign}
                  disabled={!matches || !agree || sending}
                  className="w-full"
                >
                  {sending ? 'Signing…' : 'Sign'}
                  {!sending && (
                    <Symbol name="signature" className="text-[18px]" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
};

const DocList = ({
  docs,
  onOpen,
}: {
  docs: JoinState['signed'];
  onOpen: (d: JoinDoc) => void;
}) => (
  <ul className="flex flex-col divide-y divide-zinc-100">
    {docs.map((d) => (
      <li key={d.id}>
        <button
          type="button"
          onClick={() => onOpen(d)}
          className="flex w-full items-center gap-3 py-3.5 text-left"
        >
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl',
              d.signature
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-zinc-900 text-white',
            )}
          >
            <Symbol
              name={d.signature ? 'task_alt' : 'draw'}
              className="text-[20px]"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-zinc-900">
              {d.title}
            </span>
            <span className="block text-xs text-zinc-500">
              {d.signature ? `Signed by ${d.signature.name}` : 'Read and sign'}
            </span>
          </span>
          <Symbol name="chevron_right" className="text-[22px] text-zinc-400" />
        </button>
      </li>
    ))}
  </ul>
);

const SignRound = ({
  state,
  title,
  intro,
  onOpen,
}: {
  state: JoinState;
  title: string;
  intro: string;
  onOpen: (d: JoinDoc) => void;
}) => {
  const done = state.toSign.filter((d) => d.signature).length;
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          {done} of {state.toSign.length} signed
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-950">
          {title}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-zinc-600">
          {intro}
        </p>
      </div>
      <DocList docs={state.toSign as JoinState['signed']} onOpen={onOpen} />
    </Card>
  );
};

/* --------------------------------- steps --------------------------------- */

const Fact = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: ReactNode;
}) => (
  <div className="flex items-start gap-3">
    <Symbol name={icon} className="mt-0.5 text-[20px] text-zinc-400" />
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-[15px] font-semibold text-zinc-900">{value}</p>
    </div>
  </div>
);

const AccessCard = ({
  state,
  hired,
}: {
  state: JoinState;
  hired?: boolean;
}) => (
  <Card className="flex flex-col gap-5">
    <div>
      <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
        <Symbol name={hired ? 'celebration' : 'key'} className="text-[26px]" />
      </span>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl">
        {hired
          ? `Welcome to the team, ${state.firstName}!`
          : `You're in, ${state.firstName}.`}
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-zinc-600">
        {hired
          ? 'You are fully hired. Claude is now open for you: connect it from Settings in the portal.'
          : 'Your portal account is ready. We emailed you a passcode. Sign in with Google and enter it, then start with the Portal course.'}
      </p>
    </div>
    {!hired && (state.trialStartsOn || state.trialEndsOn) && (
      <div className="grid gap-4 rounded-xl bg-zinc-50 p-4 sm:grid-cols-2">
        <Fact
          icon="flag"
          label="Trial starts"
          value={formatDay(state.trialStartsOn)}
        />
        <Fact
          icon="sports_score"
          label="Trial ends"
          value={formatDay(state.trialEndsOn)}
        />
        {state.signInEmail && (
          <Fact
            icon="mail"
            label="Sign in with Google as"
            value={state.signInEmail}
          />
        )}
      </div>
    )}
    <div className="flex flex-col gap-2 sm:flex-row">
      {state.loginUrl && (
        <LinkButton href={state.loginUrl}>
          Sign in to the portal{' '}
          <Symbol name="arrow_forward" className="text-[18px]" />
        </LinkButton>
      )}
      {state.courseUrl && (
        <LinkButton href={state.courseUrl} tone="light">
          <Symbol name="school" className="text-[18px]" /> Portal course
        </LinkButton>
      )}
    </div>
    {!hired && (
      <p className="flex items-start gap-2 text-xs leading-relaxed text-zinc-500">
        <Symbol name="info" className="text-[16px]" />
        During the trial you work in the portal directly. Claude opens once you
        are fully hired. Write a worklog every day: it is how your work is seen.
      </p>
    )}
  </Card>
);

const WaitingCard = ({ state }: { state: JoinState }) => (
  <Card className="flex flex-col gap-4">
    <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
      <Symbol name="hourglass_top" className="text-[26px]" />
    </span>
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950">
        Thanks, {state.firstName}. Your account is set up.
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-zinc-600">
        {state.contact.name} is preparing your Trial Policy and NDA. We will
        email you as soon as they are ready to sign, usually within a day. You
        can come back to this same link any time.
      </p>
    </div>
    {state.avatar && (
      <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={state.avatar}
          alt=""
          className="size-10 rounded-full object-cover"
        />
        <p className="text-sm text-zinc-600">
          This is the photo your teammates will see.
        </p>
      </div>
    )}
  </Card>
);

const EndedCard = ({ state }: { state: JoinState }) => (
  <Card className="flex flex-col gap-3">
    <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950">
      Thank you, {state.firstName}.
    </h1>
    <p className="text-[15px] leading-relaxed text-zinc-600">
      Your onboarding with {state.companyName} has closed, and your portal
      access has ended. Thank you for the time and work you gave us. If you have
      questions about anything, including your trial pay, reach out to{' '}
      {state.contact.name}.
    </p>
  </Card>
);

/** The hire's own page for joining: details, agreements, sign-in, offer. */
export const JoinPage = ({ initial }: { initial: JoinState }) => {
  const [state, setState] = useState(initial);
  const [open, setOpen] = useState<JoinDoc | null>(null);

  const update = (next: JoinState) => {
    setState(next);
    const nextDoc = next.toSign.find((d) => !d.signature) ?? null;
    setOpen(nextDoc);
  };

  const showSigned =
    state.signed.length > 0 && state.step !== ONBOARDING_STEP.DETAILS;

  return (
    <Shell>
      <Header state={state} />
      <Stepper step={state.step} />

      {state.step === ONBOARDING_STEP.DETAILS && (
        <DetailsForm state={state} onDone={setState} />
      )}

      {state.step === ONBOARDING_STEP.AGREEMENTS &&
        (state.waitingOnTeam ? (
          <WaitingCard state={state} />
        ) : (
          <SignRound
            state={state}
            title="Two agreements to sign"
            intro="The Trial Policy explains how your trial works and how you are paid for it. The NDA keeps our work and our clients' work private. Read each one, then sign with your name. Your sign-in comes right after."
            onOpen={setOpen}
          />
        ))}

      {state.step === ONBOARDING_STEP.TRIAL && <AccessCard state={state} />}

      {state.step === ONBOARDING_STEP.OFFER && (
        <SignRound
          state={state}
          title={`Congratulations, ${state.firstName}!`}
          intro="Your trial went well and we would love you to join us. Here is your offer letter and work agreement. Sign both to become a full member of the team."
          onOpen={setOpen}
        />
      )}

      {state.step === ONBOARDING_STEP.HIRED && (
        <AccessCard state={state} hired />
      )}
      {state.step === ONBOARDING_STEP.ENDED && <EndedCard state={state} />}

      {state.step !== ONBOARDING_STEP.DETAILS && <ContactCard state={state} />}

      {showSigned && (
        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
            Your signed copies
          </h2>
          <DocList docs={state.signed} onOpen={setOpen} />
        </Card>
      )}

      {open && (
        <DocReader
          key={open.id}
          state={state}
          doc={state.toSign.find((d) => d.id === open.id) ?? open}
          onClose={() => setOpen(null)}
          onSigned={(next) => {
            const remaining = next.toSign.filter((d) => !d.signature);
            if (!remaining.length) window.scrollTo({ top: 0 });
            update(next);
          }}
        />
      )}
    </Shell>
  );
};

export const JoinLinkMissing = () => (
  <Shell>
    <Card className="mt-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950">
        This link doesn&apos;t open anything.
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-zinc-600">
        Check that you copied the whole link from your email. If it still
        doesn&apos;t work, reply to that email and we will send a new one.
      </p>
    </Card>
  </Shell>
);
