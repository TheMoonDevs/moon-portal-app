import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache, Suspense } from 'react';

import {
  BookingPage,
  type PublicMeetProfile,
} from '@/components/screens/Meet/BookingPage';
import { hostName, isMeetCode, loadHost } from '@/lib/meet/server';
import { db } from '@/lib/mongodb/db-client';
import type { MeetProfile } from '@/models/meet';

export const dynamic = 'force-dynamic';

type Props = { params: { code: string } };

/** The link and its owner, as much as a guest may see. */
const loadLink = cache(
  async (
    code: string,
  ): Promise<(PublicMeetProfile & { isActive: boolean }) | null> => {
    if (!isMeetCode(code)) return null;
    const profile: MeetProfile | null = await db.meetProfile.findFirst({
      where: { code },
    });
    if (!profile) return null;
    const host = await loadHost(profile.userId);
    if (!host || (host as { status?: string }).status !== 'ACTIVE') return null;
    return {
      code: profile.code,
      hostName: hostName(host),
      avatar: host.avatar ?? null,
      title: profile.title ?? null,
      description: profile.description ?? null,
      durationMinutes: profile.durationMinutes,
      requiresApproval: profile.requiresApproval,
      isActive: profile.isActive,
    };
  },
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const link = await loadLink(params.code);
  if (!link) return { title: 'Link not found' };
  return {
    title: link.title || `Meet ${link.hostName}`,
    description: `Book a ${link.durationMinutes} minute meeting with ${link.hostName}.`,
    robots: { index: false },
  };
}

export default async function Meet({ params }: Props) {
  const link = await loadLink(params.code);
  if (!link) notFound();
  if (!link.isActive)
    return (
      <div className="flex min-h-dvh items-center justify-center bg-neutral-950 px-4 text-center">
        <div>
          <p className="text-lg font-semibold text-white">
            {link.hostName} isn’t taking meetings right now
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            Try this link again later.
          </p>
        </div>
      </div>
    );
  return (
    <Suspense>
      <BookingPage profile={link} />
    </Suspense>
  );
}
