'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { MAX_NOTE } from '@/lib/meet/rules';
import {
  addDays,
  allTimezones,
  dateIn,
  formatDay,
  formatRange,
  formatTime,
  isTimezone,
  localTimezone,
  timezoneLabel,
  weekdayOf,
} from '@/lib/meet/time';
import { cn } from '@/lib/utils';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';

import {
  AdminButton,
  Field,
  Icon,
  NativeSelect,
  Spin,
  TextArea,
  TextInput,
  UserAvatar,
} from '../Admin/shared/AdminUI';

/** What a guest may see of someone's booking link. */
export interface PublicMeetProfile {
  code: string;
  hostName: string;
  avatar: string | null;
  title: string | null;
  description: string | null;
  durationMinutes: number;
  requiresApproval: boolean;
}

type Done = {
  status: 'PENDING' | 'CONFIRMED';
  start: string;
  end: string;
  meetingUrl: string | null;
  manageUrl: string;
};

const WEEK_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** A month grid; days with free times can be picked. */
const MonthPicker = ({
  month,
  setMonth,
  available,
  selected,
  onSelect,
  today,
}: {
  month: string;
  setMonth: (month: string) => void;
  available: Set<string>;
  selected: string | null;
  onSelect: (day: string) => void;
  today: string;
}) => {
  const first = `${month}-01`;
  const lead = weekdayOf(first);
  const days: Array<string | null> = Array.from({ length: lead }, () => null);
  if (/^\d{4}-\d{2}$/.test(month))
    for (let day = first; day.startsWith(month); day = addDays(day, 1))
      days.push(day);
  const label = new Date(`${first}T12:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const prev = addDays(first, -1).slice(0, 7);
  const next = addDays(first, 32).slice(0, 7);
  const lastAvailable = Array.from(available).sort().pop() ?? today;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{label}</p>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Previous month"
            disabled={prev < today.slice(0, 7)}
            onClick={() => setMonth(prev)}
            className="flex size-8 items-center justify-center rounded-lg text-[20px] text-neutral-300 hover:bg-white/[0.07] disabled:opacity-30"
          >
            <Icon name="chevron_left" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            disabled={next > lastAvailable.slice(0, 7)}
            onClick={() => setMonth(next)}
            className="flex size-8 items-center justify-center rounded-lg text-[20px] text-neutral-300 hover:bg-white/[0.07] disabled:opacity-30"
          >
            <Icon name="chevron_right" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEK_LABELS.map((d, i) => (
          <span key={i} className="pb-1 text-[11px] text-neutral-500">
            {d}
          </span>
        ))}
        {days.map((day, i) =>
          day ? (
            <button
              key={day}
              type="button"
              disabled={!available.has(day)}
              onClick={() => onSelect(day)}
              className={cn(
                'flex aspect-square items-center justify-center rounded-full text-sm transition-colors',
                available.has(day)
                  ? 'bg-white/[0.08] font-semibold text-white hover:bg-white/20'
                  : 'text-neutral-600',
                selected === day && 'bg-white text-neutral-950 hover:bg-white',
                day === today && selected !== day && 'ring-1 ring-white/30',
              )}
            >
              {Number(day.slice(8))}
            </button>
          ) : (
            <span key={`blank-${i}`} />
          ),
        )}
      </div>
    </div>
  );
};

export const BookingPage = ({ profile }: { profile: PublicMeetProfile }) => {
  const params = useSearchParams();
  const [timezone, setTimezone] = useState('UTC');
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [month, setMonth] = useState('');
  const [start, setStart] = useState<string | null>(null);
  const [name, setName] = useState(params?.get('name') ?? '');
  const [email, setEmail] = useState(params?.get('email') ?? '');
  const [note, setNote] = useState('');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  const loadSlots = async () => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/meet/public/${profile.code}`, {
        cache: 'no-store',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Could not load times.');
      setSlots(body.data.slots ?? []);
    } catch (e) {
      setLoadError((e as Error).message);
      setSlots([]);
    }
  };

  useEffect(() => {
    setTimezone(localTimezone());
    loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byDay = useMemo(() => {
    const out = new Map<string, string[]>();
    for (const slot of slots ?? []) {
      const key = dateIn(new Date(slot), timezone);
      out.set(key, [...(out.get(key) ?? []), slot]);
    }
    return out;
  }, [slots, timezone]);
  const available = useMemo(() => new Set(byDay.keys()), [byDay]);
  const today = dateIn(new Date(), timezone);

  // Open on the first day with free times, and keep the pick valid when the
  // timezone changes.
  useEffect(() => {
    if (!slots) return;
    const first = Array.from(available).sort()[0] ?? today;
    if (!day || !available.has(day)) {
      setDay(available.size ? first : null);
      setMonth(first.slice(0, 7));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, available]);

  const times = day ? (byDay.get(day) ?? []) : [];
  const zones = useMemo(() => allTimezones(), []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!start) return;
    const local: Record<string, string> = {};
    if (!name.trim()) local.name = 'Add your name.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      local.email = 'Add a valid email address.';
    setErrors(local);
    if (Object.keys(local).length) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/meet/public/${profile.code}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          tmd_portal_api_key: TMD_PORTAL_API_KEY,
        },
        body: JSON.stringify({ start, name, email, note, timezone, website }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone(body.data);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (body?.errors) setErrors(body.errors);
      setFormError(body?.error || 'Something went wrong. Please try again.');
      if (res.status === 409) {
        setStart(null);
        loadSlots();
      }
    } catch {
      setFormError('We could not reach the server. Check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const heading = profile.title || `Meet ${profile.hostName}`;

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:py-16">
        <header className="flex items-start gap-4">
          <UserAvatar src={profile.avatar} name={profile.hostName} size={56} />
          <div className="min-w-0">
            <p className="text-sm text-neutral-400">{profile.hostName}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {heading}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Icon name="schedule" className="text-[16px]" />
                {profile.durationMinutes} min
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="videocam" className="text-[16px]" />
                Video call, link sent by email
              </span>
            </p>
            {profile.description && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
                {profile.description}
              </p>
            )}
          </div>
        </header>

        {done ? (
          <section className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-[26px] text-emerald-300">
              <Icon
                name={
                  done.status === 'CONFIRMED'
                    ? 'event_available'
                    : 'schedule_send'
                }
              />
            </span>
            <h2 className="text-lg font-semibold text-white">
              {done.status === 'CONFIRMED' ? 'You’re booked' : 'Request sent'}
            </h2>
            <p className="text-sm font-medium text-neutral-200">
              {formatRange(done.start, done.end, timezone)}
            </p>
            <p className="max-w-md text-sm text-neutral-400">
              {done.status === 'CONFIRMED'
                ? `A calendar invite with the meeting link is on its way to ${email}.`
                : `${profile.hostName} will confirm it soon. You'll get an email at ${email} with the meeting link and a calendar invite.`}
            </p>
            {done.meetingUrl && (
              <a
                href={done.meetingUrl}
                className="text-sm text-sky-300 underline"
                target="_blank"
                rel="noreferrer"
              >
                {done.meetingUrl}
              </a>
            )}
            <a
              href={done.manageUrl}
              className="text-xs text-neutral-500 underline hover:text-neutral-300"
            >
              Need to cancel?
            </a>
          </section>
        ) : (
          <section className="rounded-2xl border border-white/[0.07] bg-neutral-900/40 p-5 sm:p-6">
            {!slots ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-400">
                <Spin /> Finding free times…
              </div>
            ) : loadError || !available.size ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Icon
                  name="event_busy"
                  className="text-[28px] text-neutral-500"
                />
                <p className="text-sm text-neutral-300">
                  {loadError ||
                    `${profile.hostName} has no free times right now.`}
                </p>
                <p className="text-xs text-neutral-500">
                  Try again in a few days.
                </p>
              </div>
            ) : !start ? (
              <div className="grid gap-6 md:grid-cols-[1fr_220px]">
                <div className="flex flex-col gap-4">
                  <h2 className="text-base font-semibold text-white">
                    Pick a day and time
                  </h2>
                  <MonthPicker
                    month={month}
                    setMonth={setMonth}
                    available={available}
                    selected={day}
                    onSelect={setDay}
                    today={today}
                  />
                  <Field label="Your timezone" htmlFor="meet-tz">
                    <NativeSelect
                      id="meet-tz"
                      value={timezone}
                      onChange={(e) =>
                        isTimezone(e.target.value) &&
                        setTimezone(e.target.value)
                      }
                    >
                      {(zones.includes(timezone)
                        ? zones
                        : [timezone, ...zones]
                      ).map((tz) => (
                        <option key={tz} value={tz}>
                          {tz.replace(/_/g, ' ')} ({timezoneLabel(tz)})
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
                <div className="flex flex-col gap-2">
                  {day && (
                    <p className="text-sm font-medium text-neutral-300">
                      {formatDay(`${day}T12:00:00Z`, 'UTC')}
                    </p>
                  )}
                  <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-1">
                    {times.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setStart(slot)}
                        className="h-10 shrink-0 rounded-lg border border-white/15 text-sm font-medium text-white transition-colors hover:border-white hover:bg-white hover:text-neutral-950"
                      >
                        {formatTime(slot, timezone)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <form
                noValidate
                onSubmit={submit}
                className="flex flex-col gap-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-neutral-200">
                    <Icon
                      name="event"
                      className="text-[18px] text-neutral-400"
                    />
                    {formatRange(
                      start,
                      new Date(
                        new Date(start).getTime() +
                          profile.durationMinutes * 60000,
                      ).toISOString(),
                      timezone,
                    )}
                  </div>
                  <AdminButton
                    type="button"
                    size="sm"
                    tone="ghost"
                    icon="arrow_back"
                    onClick={() => setStart(null)}
                  >
                    Change
                  </AdminButton>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Your name"
                    htmlFor="meet-name"
                    required
                    error={errors.name}
                  >
                    <TextInput
                      id="meet-name"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={cn(errors.name && 'border-rose-500/40')}
                    />
                  </Field>
                  <Field
                    label="Email"
                    htmlFor="meet-email"
                    required
                    error={errors.email}
                  >
                    <TextInput
                      id="meet-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={cn(errors.email && 'border-rose-500/40')}
                    />
                  </Field>
                </div>
                <Field
                  label="Anything to share before the meeting?"
                  htmlFor="meet-note"
                  hint="Optional"
                >
                  <TextArea
                    id="meet-note"
                    rows={3}
                    maxLength={MAX_NOTE}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </Field>
                {/* Hidden from people; bots fill it in. */}
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden
                  className="hidden"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
                {formError && (
                  <p className="flex items-center gap-1.5 text-sm text-rose-300">
                    <Icon name="error" className="text-[16px]" />
                    {formError}
                  </p>
                )}
                <AdminButton
                  type="submit"
                  tone="primary"
                  loading={submitting}
                  className="self-start"
                >
                  {profile.requiresApproval
                    ? 'Request meeting'
                    : 'Book meeting'}
                </AdminButton>
                {profile.requiresApproval && (
                  <p className="-mt-2 text-xs text-neutral-500">
                    {profile.hostName} confirms each request. You’ll get the
                    meeting link by email once they do.
                  </p>
                )}
              </form>
            )}
          </section>
        )}
        <p className="text-center text-xs text-neutral-600">
          Times are shown in {timezone.replace(/_/g, ' ')}.
        </p>
      </div>
    </div>
  );
};
