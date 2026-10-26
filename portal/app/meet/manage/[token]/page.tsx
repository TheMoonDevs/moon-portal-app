import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
  type GuestBooking,
  ManageBookingPage,
} from '@/components/screens/Meet/ManageBookingPage';
import { hostName, isBookingToken, loadHost } from '@/lib/meet/server';
import { db } from '@/lib/mongodb/db-client';
import type { MeetBooking, MeetProfile } from '@/models/meet';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your meeting',
  robots: { index: false },
};

type Props = { params: { token: string } };

/** A guest's own booking, opened from the link in their emails. */
export default async function ManageBooking({ params }: Props) {
  if (!isBookingToken(params.token)) notFound();
  const booking: MeetBooking | null = await db.meetBooking.findFirst({
    where: { token: params.token },
  });
  if (!booking) notFound();
  const [host, profile] = await Promise.all([
    loadHost(booking.hostId),
    db.meetProfile.findFirst({
      where: { id: booking.profileId },
    }) as Promise<MeetProfile | null>,
  ]);

  const view: GuestBooking = {
    token: booking.token,
    hostName: host ? hostName(host) : 'Your host',
    avatar: host?.avatar ?? null,
    title: profile?.title ?? null,
    guestName: booking.guestName,
    guestEmail: booking.guestEmail,
    guestTimezone: booking.guestTimezone,
    start: booking.start,
    end: booking.end,
    requestedStart: booking.requestedStart,
    status: booking.status,
    reason: booking.reason ?? null,
    meetingUrl: booking.meetingUrl ?? null,
    bookAgainUrl:
      profile?.isActive && profile.code ? `/meet/${profile.code}` : null,
  };
  return <ManageBookingPage booking={view} />;
}
