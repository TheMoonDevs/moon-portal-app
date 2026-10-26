'use client';

import { useEffect, useState } from 'react';

import { MAX_REASON } from '@/lib/meet/rules';
import { formatRange, localTimezone } from '@/lib/meet/time';
import { MEET_BOOKING_STATUS } from '@/models/meet';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';

import {
  AdminButton,
  Field,
  Icon,
  TextArea,
  UserAvatar,
} from '../Admin/shared/AdminUI';

/** What a guest sees of their own booking. */
export interface GuestBooking {
  token: string;
  hostName: string;
  avatar: string | null;
  title: string | null;
  guestName: string;
  guestEmail: string;
  guestTimezone: string;
  start: string;
  end: string;
  requestedStart: string;
  status: MEET_BOOKING_STATUS;
  reason: string | null;
  meetingUrl: string | null;
  bookAgainUrl: string | null;
}

const STATUS_TEXT: Record<
  MEET_BOOKING_STATUS,
  { icon: string; title: string }
> = {
  PENDING: { icon: 'schedule_send', title: 'Waiting for confirmation' },
  PROPOSED: { icon: 'update', title: 'A new time was suggested' },
  CONFIRMED: { icon: 'event_available', title: 'Confirmed' },
  DECLINED: { icon: 'event_busy', title: 'Declined' },
  CANCELLED: { icon: 'event_busy', title: 'Cancelled' },
};

export const ManageBookingPage = ({ booking }: { booking: GuestBooking }) => {
  const [state, setState] = useState(booking);
  const [timezone, setTimezone] = useState(booking.guestTimezone || 'UTC');
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'accept' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setTimezone(localTimezone()), []);

  const over = new Date(state.end).getTime() < Date.now();
  const open =
    !over &&
    [
      MEET_BOOKING_STATUS.PENDING,
      MEET_BOOKING_STATUS.PROPOSED,
      MEET_BOOKING_STATUS.CONFIRMED,
    ].includes(state.status);

  const act = async (action: 'accept' | 'cancel') => {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/meet/manage/${state.token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          tmd_portal_api_key: TMD_PORTAL_API_KEY,
        },
        body: JSON.stringify({ action, reason }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Something went wrong.');
      setState((s) => ({
        ...s,
        status: body.data.status,
        meetingUrl: body.data.meetingUrl ?? s.meetingUrl,
      }));
      setCancelling(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const status = STATUS_TEXT[state.status];

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10 sm:py-16">
        <header className="flex items-center gap-3">
          <UserAvatar src={state.avatar} name={state.hostName} size={44} />
          <div>
            <p className="text-sm text-neutral-400">
              {state.title || 'Meeting'} with
            </p>
            <h1 className="text-xl font-semibold text-white">
              {state.hostName}
            </h1>
          </div>
        </header>

        <section className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-neutral-900/40 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Icon name={status.icon} className="text-[20px] text-neutral-300" />
            {over && state.status === MEET_BOOKING_STATUS.CONFIRMED
              ? 'This meeting has ended'
              : status.title}
          </div>

          <p className="text-sm text-neutral-200">
            {formatRange(state.start, state.end, timezone)}
          </p>

          {state.status === MEET_BOOKING_STATUS.PROPOSED && (
            <p className="text-sm text-neutral-400">
              You asked for{' '}
              <span className="line-through">
                {formatRange(
                  state.requestedStart,
                  new Date(
                    new Date(state.requestedStart).getTime() +
                      (new Date(state.end).getTime() -
                        new Date(state.start).getTime()),
                  ).toISOString(),
                  timezone,
                )}
              </span>
              .
            </p>
          )}

          {state.reason && state.status !== MEET_BOOKING_STATUS.PENDING && (
            <p className="rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-neutral-300">
              “{state.reason}”
            </p>
          )}

          {state.status === MEET_BOOKING_STATUS.CONFIRMED &&
            state.meetingUrl &&
            !over && (
              <a
                href={state.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 self-start text-sm text-sky-300 underline"
              >
                <Icon name="videocam" className="text-[16px]" />
                Join the call
              </a>
            )}

          {state.status === MEET_BOOKING_STATUS.PENDING && (
            <p className="text-sm text-neutral-400">
              {state.hostName} hasn’t answered yet. You’ll get an email at{' '}
              {state.guestEmail} as soon as they do.
            </p>
          )}

          {error && (
            <p className="flex items-center gap-1.5 text-sm text-rose-300">
              <Icon name="error" className="text-[16px]" />
              {error}
            </p>
          )}

          {open && !cancelling && (
            <div className="flex flex-wrap gap-2">
              {state.status === MEET_BOOKING_STATUS.PROPOSED && (
                <AdminButton
                  tone="primary"
                  icon="check"
                  loading={busy === 'accept'}
                  onClick={() => act('accept')}
                >
                  Accept new time
                </AdminButton>
              )}
              <AdminButton
                tone="danger"
                icon="event_busy"
                onClick={() => setCancelling(true)}
              >
                {state.status === MEET_BOOKING_STATUS.CONFIRMED
                  ? 'Cancel meeting'
                  : 'Cancel request'}
              </AdminButton>
            </div>
          )}

          {open && cancelling && (
            <div className="flex flex-col gap-3">
              <Field
                label="Let them know why"
                htmlFor="cancel-reason"
                hint="Optional"
              >
                <TextArea
                  id="cancel-reason"
                  rows={3}
                  maxLength={MAX_REASON}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </Field>
              <div className="flex gap-2">
                <AdminButton
                  tone="danger"
                  loading={busy === 'cancel'}
                  onClick={() => act('cancel')}
                >
                  Yes, cancel
                </AdminButton>
                <AdminButton tone="ghost" onClick={() => setCancelling(false)}>
                  Keep it
                </AdminButton>
              </div>
            </div>
          )}

          {!open &&
            state.bookAgainUrl &&
            state.status !== MEET_BOOKING_STATUS.DECLINED && (
              <a
                href={state.bookAgainUrl}
                className="self-start text-sm text-sky-300 underline"
              >
                Book another time
              </a>
            )}
        </section>
        <p className="text-center text-xs text-neutral-600">
          Times are shown in {timezone.replace(/_/g, ' ')}.
        </p>
      </div>
    </div>
  );
};
