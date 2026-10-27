'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { MAX_REASON } from '@/lib/meet/rules';
import { dateIn, formatDay, formatRange, formatTime } from '@/lib/meet/time';
import { cn } from '@/lib/utils';
import { MEET_BOOKING_STATUS } from '@/models/meet';

import {
  AdminButton,
  AdminModal,
  EmptyState,
  Field,
  Icon,
  Panel,
  PanelHeader,
  Pill,
  type PillTone,
  Spin,
  TextArea,
} from '../Admin/shared/AdminUI';
import { answerBooking, type HostBooking, meetApi } from './api';

const STATUS: Record<MEET_BOOKING_STATUS, { label: string; tone: PillTone }> = {
  PENDING: { label: 'Needs your answer', tone: 'warning' },
  PROPOSED: { label: 'New time sent', tone: 'info' },
  CONFIRMED: { label: 'Confirmed', tone: 'positive' },
  DECLINED: { label: 'Declined', tone: 'neutral' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

type Dialog = { kind: 'propose' | 'decline' | 'cancel'; booking: HostBooking };

/** Picks a free time to offer instead, grouped by day. */
const ProposePicker = ({
  bookingId,
  timezone,
  value,
  onChange,
}: {
  bookingId: string;
  timezone: string;
  value: string | null;
  onChange: (slot: string) => void;
}) => {
  const [slots, setSlots] = useState<string[] | null>(null);
  const [day, setDay] = useState<string | null>(null);

  useEffect(() => {
    meetApi<{ slots: string[] }>(`/api/meet/bookings/${bookingId}/slots`)
      .then((data) => setSlots(data.slots))
      .catch(() => setSlots([]));
  }, [bookingId]);

  const byDay = useMemo(() => {
    const out = new Map<string, string[]>();
    for (const slot of slots ?? []) {
      const key = dateIn(new Date(slot), timezone);
      out.set(key, [...(out.get(key) ?? []), slot]);
    }
    return out;
  }, [slots, timezone]);

  useEffect(() => {
    if (!day && byDay.size) setDay(Array.from(byDay.keys())[0]);
  }, [byDay, day]);

  if (!slots)
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-neutral-400">
        <Spin /> Finding your free times…
      </div>
    );
  if (!slots.length)
    return (
      <p className="py-4 text-sm text-neutral-400">
        You have no free times left in your booking window. Add hours under
        Availability, or decline instead.
      </p>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {Array.from(byDay.keys()).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDay(d)}
            className={cn(
              'shrink-0 rounded-lg border px-3 py-1.5 text-xs',
              d === day
                ? 'border-white bg-white text-neutral-950'
                : 'border-white/10 text-neutral-300 hover:bg-white/[0.06]',
            )}
          >
            {new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              timeZone: 'UTC',
            })}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {(day ? (byDay.get(day) ?? []) : []).map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => onChange(slot)}
            className={cn(
              'h-9 rounded-lg border text-sm',
              slot === value
                ? 'border-white bg-white font-semibold text-neutral-950'
                : 'border-white/10 text-neutral-200 hover:border-white/30',
            )}
          >
            {formatTime(slot, timezone)}
          </button>
        ))}
      </div>
    </div>
  );
};

const BookingRow = ({
  booking,
  timezone,
  highlighted,
  onApprove,
  onDialog,
  approving,
}: {
  booking: HostBooking;
  timezone: string;
  highlighted: boolean;
  onApprove: () => void;
  onDialog: (kind: Dialog['kind']) => void;
  approving: boolean;
}) => {
  const status = STATUS[booking.status];
  const past = new Date(booking.end).getTime() < Date.now();
  const expired = past && booking.status !== MEET_BOOKING_STATUS.CONFIRMED;
  return (
    <div
      id={`booking-${booking.id}`}
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between',
        highlighted && 'border-white/40 bg-white/[0.06]',
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-white">{booking.guestName}</p>
          <Pill tone={expired ? 'neutral' : status.tone}>
            {expired ? 'Expired' : status.label}
          </Pill>
          {booking.applicationId && (
            <Pill tone="purple" icon="badge">
              {booking.role ? `Applicant · ${booking.role}` : 'Applicant'}
            </Pill>
          )}
        </div>
        <p className="mt-1 text-sm text-neutral-300">
          {formatRange(booking.start, booking.end, timezone)}
        </p>
        <p className="text-xs text-neutral-500">
          {booking.guestEmail}
          {booking.status === MEET_BOOKING_STATUS.PROPOSED &&
            ` · asked for ${formatDay(booking.requestedStart, timezone)}, ${formatTime(booking.requestedStart, timezone)}`}
        </p>
        {booking.guestNote && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-400">
            “{booking.guestNote}”
          </p>
        )}
        {booking.status === MEET_BOOKING_STATUS.CONFIRMED &&
          booking.meetingUrl &&
          !past && (
            <a
              href={booking.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-sky-300 underline"
            >
              <Icon name="videocam" className="text-[14px]" />
              {booking.meetingUrl}
            </a>
          )}
      </div>
      {!past && (
        <div className="flex shrink-0 flex-wrap gap-2">
          {booking.status === MEET_BOOKING_STATUS.PENDING && (
            <>
              <AdminButton
                size="sm"
                tone="primary"
                icon="check"
                loading={approving}
                onClick={onApprove}
              >
                Approve
              </AdminButton>
              <AdminButton
                size="sm"
                icon="update"
                onClick={() => onDialog('propose')}
              >
                New time
              </AdminButton>
              <AdminButton
                size="sm"
                tone="ghost"
                onClick={() => onDialog('decline')}
              >
                Decline
              </AdminButton>
            </>
          )}
          {booking.status === MEET_BOOKING_STATUS.PROPOSED && (
            <AdminButton
              size="sm"
              icon="update"
              onClick={() => onDialog('propose')}
            >
              Change time
            </AdminButton>
          )}
          {(booking.status === MEET_BOOKING_STATUS.CONFIRMED ||
            booking.status === MEET_BOOKING_STATUS.PROPOSED) && (
            <AdminButton
              size="sm"
              tone="ghost"
              onClick={() => onDialog('cancel')}
            >
              Cancel
            </AdminButton>
          )}
        </div>
      )}
    </div>
  );
};

export const BookingsList = ({
  bookings,
  timezone,
  loading,
  focusId,
  openPropose,
  onChanged,
}: {
  bookings: HostBooking[];
  timezone: string;
  loading: boolean;
  focusId: string | null;
  openPropose: boolean;
  onChanged: (booking: HostBooking) => void;
}) => {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [reason, setReason] = useState('');
  const [slot, setSlot] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    if (!focusId || loading) return;
    const booking = bookings.find((b) => b.id === focusId);
    document
      .getElementById(`booking-${focusId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (openPropose && booking?.status === MEET_BOOKING_STATUS.PENDING)
      setDialog({ kind: 'propose', booking });
    // Only when the page opens on a booking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, loading]);

  const now = Date.now();
  const isUpcoming = (b: HostBooking) =>
    new Date(b.end).getTime() >= now &&
    b.status !== MEET_BOOKING_STATUS.DECLINED &&
    b.status !== MEET_BOOKING_STATUS.CANCELLED;
  const requests = bookings.filter(
    (b) => isUpcoming(b) && b.status === MEET_BOOKING_STATUS.PENDING,
  );
  const upcoming = bookings.filter(
    (b) => isUpcoming(b) && b.status !== MEET_BOOKING_STATUS.PENDING,
  );
  const past = bookings.filter((b) => !isUpcoming(b)).reverse();

  const run = async (
    booking: HostBooking,
    action: 'approve' | 'propose' | 'decline' | 'cancel',
    extra: { start?: string; reason?: string } = {},
  ) => {
    setBusyId(booking.id);
    try {
      const { booking: updated } = await answerBooking(
        booking.id,
        action,
        extra,
      );
      onChanged({ ...updated, role: booking.role });
      toast.success(
        {
          approve: `Confirmed. ${booking.guestName} has the invite.`,
          propose: `New time sent to ${booking.guestName}.`,
          decline: `Declined. ${booking.guestName} has been told.`,
          cancel: `Cancelled. ${booking.guestName} has been told.`,
        }[action],
      );
      setDialog(null);
      setReason('');
      setSlot(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const row = (b: HostBooking) => (
    <BookingRow
      key={b.id}
      booking={b}
      timezone={timezone}
      highlighted={b.id === focusId}
      approving={busyId === b.id && !dialog}
      onApprove={() => run(b, 'approve')}
      onDialog={(kind) => {
        setReason('');
        setSlot(null);
        setDialog({ kind, booking: b });
      }}
    />
  );

  return (
    <>
      <Panel>
        <PanelHeader
          icon="event"
          title="Meetings"
          description={`Times in ${timezone.replace(/_/g, ' ')}`}
          className="border-b border-white/[0.07] p-4"
        />
        <div className="flex flex-col gap-5 p-4">
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-neutral-400">
              <Spin /> Loading…
            </div>
          ) : !requests.length && !upcoming.length ? (
            <EmptyState
              icon="event_available"
              title="No meetings yet"
              description="Share your link. Requests show up here and in your notifications."
            />
          ) : (
            <>
              {requests.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-300">
                    Requests · {requests.length}
                  </p>
                  {requests.map(row)}
                </div>
              )}
              {upcoming.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                    Upcoming
                  </p>
                  {upcoming.map(row)}
                </div>
              )}
            </>
          )}
          {past.length > 0 && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowPast((v) => !v)}
                className="flex items-center gap-1 self-start text-xs font-medium uppercase tracking-wide text-neutral-500 hover:text-neutral-300"
              >
                <Icon
                  name={showPast ? 'expand_less' : 'expand_more'}
                  className="text-[16px]"
                />
                Past and closed · {past.length}
              </button>
              {showPast && past.map(row)}
            </div>
          )}
        </div>
      </Panel>

      <AdminModal
        open={!!dialog}
        onOpenChange={(open) => !open && setDialog(null)}
        icon={
          dialog?.kind === 'propose'
            ? 'update'
            : dialog?.kind === 'decline'
              ? 'event_busy'
              : 'cancel'
        }
        title={
          dialog?.kind === 'propose'
            ? `Suggest another time to ${dialog.booking.guestName}`
            : dialog?.kind === 'decline'
              ? `Decline ${dialog?.booking.guestName}'s request`
              : `Cancel the meeting with ${dialog?.booking.guestName}`
        }
        description={
          dialog
            ? `${dialog.kind === 'propose' ? 'They asked for' : 'Booked for'} ${formatRange(dialog.booking.start, dialog.booking.end, timezone)}`
            : undefined
        }
        footer={
          dialog && (
            <>
              <AdminButton
                size="sm"
                tone="ghost"
                onClick={() => setDialog(null)}
              >
                Back
              </AdminButton>
              <AdminButton
                size="sm"
                tone={dialog.kind === 'propose' ? 'primary' : 'danger'}
                disabled={dialog.kind === 'propose' && !slot}
                loading={busyId === dialog.booking.id}
                onClick={() =>
                  run(dialog.booking, dialog.kind, {
                    reason,
                    ...(slot ? { start: slot } : {}),
                  })
                }
              >
                {dialog.kind === 'propose'
                  ? 'Send new time'
                  : dialog.kind === 'decline'
                    ? 'Decline'
                    : 'Cancel meeting'}
              </AdminButton>
            </>
          )
        }
      >
        {dialog && (
          <div className="flex flex-col gap-4">
            {dialog.kind === 'propose' && (
              <ProposePicker
                bookingId={dialog.booking.id}
                timezone={timezone}
                value={slot}
                onChange={setSlot}
              />
            )}
            <Field
              label={`Message to ${dialog.booking.guestName.split(' ')[0]}`}
              htmlFor="meet-reason"
              hint="Optional. It goes in the email."
            >
              <TextArea
                id="meet-reason"
                rows={3}
                maxLength={MAX_REASON}
                value={reason}
                placeholder={
                  dialog.kind === 'propose'
                    ? 'Sorry, I have a clash then. Does this work?'
                    : ''
                }
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
          </div>
        )}
      </AdminModal>
    </>
  );
};
