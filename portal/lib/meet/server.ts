import { randomBytes, randomInt } from 'crypto';

import { db } from '@/lib/mongodb/db-client';
import { slugify } from '@/lib/workspace/server';
import type { JobApplication, JobOpening } from '@/models/hiring';
import {
  ACTIVE_MEET_STATUSES,
  type MeetBooking,
  type MeetProfile,
} from '@/models/meet';
import { MEMBER_STATUS } from '@/models/workspace';

import { type BusyTime, defaultProfile, freeSlots } from './rules';

/* ---------------------------------- codes -------------------------------- */

// No 0/O, 1/l/I: codes get read aloud and typed from screenshots.
const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 8;
const CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

export const isMeetCode = (value: unknown): value is string =>
  typeof value === 'string' && CODE_PATTERN.test(value);

const randomCode = () =>
  Array.from(
    { length: CODE_LENGTH },
    () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
  ).join('');

/** An invite code no other link uses. */
export async function uniqueMeetCode(): Promise<string> {
  for (;;) {
    const code = randomCode();
    if (!(await db.meetProfile.count({ where: { code } }))) return code;
  }
}

/** A secret for a guest's manage link. */
export const newBookingToken = () => randomBytes(24).toString('base64url');

export const isBookingToken = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{32}$/.test(value);

/* --------------------------------- profiles ------------------------------ */

type HostUser = {
  id: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  avatar?: string | null;
  timezone?: string | null;
};

export const hostName = (host: Omit<HostUser, 'id'>) =>
  host.name?.trim() || host.username || 'Someone';

/** The user's booking link settings, made with the defaults on first use. */
export async function getOrCreateProfile(userId: string): Promise<MeetProfile> {
  const existing: MeetProfile | null = await db.meetProfile.findFirst({
    where: { userId },
  });
  if (existing) return existing;
  const user: HostUser | null = await db.user.findFirst({
    where: { id: userId },
  });
  const now = new Date().toISOString();
  return db.meetProfile.create({
    data: {
      userId,
      code: await uniqueMeetCode(),
      ...defaultProfile(user?.timezone || 'UTC'),
      createdAt: now,
      updatedAt: now,
    },
  });
}

export async function loadHost(userId: string): Promise<HostUser | null> {
  return db.user.findFirst({ where: { id: userId } });
}

export const meetLink = (origin: string, code: string) =>
  `${origin}/meet/${code}`;

export const manageLink = (origin: string, token: string) =>
  `${origin}/meet/manage/${token}`;

/* ---------------------------------- slots -------------------------------- */

/** Times the host already has, from now on, except `exceptId`. */
export async function busyTimes(
  hostId: string,
  exceptId?: string,
): Promise<BusyTime[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const bookings: MeetBooking[] = await db.meetBooking.findMany({
    where: {
      hostId,
      status: { in: ACTIVE_MEET_STATUSES },
      end: { gt: since },
    },
    select: { id: true, start: true, end: true },
  });
  return bookings
    .filter((b) => b.id !== exceptId)
    .map((b) => ({ start: b.start, end: b.end }));
}

export async function slotsFor(
  profile: MeetProfile,
  options: { exceptId?: string; ignoreNotice?: boolean } = {},
) {
  return freeSlots(profile, await busyTimes(profile.userId, options.exceptId), {
    ignoreNotice: options.ignoreNotice,
  });
}

/** Whether `start` is still free for this host. */
export async function isSlotFree(
  profile: MeetProfile,
  start: string,
  options: { exceptId?: string; ignoreNotice?: boolean } = {},
) {
  return (await slotsFor(profile, options)).includes(start);
}

/** Normalises a client's ISO time to the exact form slots use. */
export const toSlot = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? null : time.toISOString();
};

/* ------------------------------ meeting rooms ---------------------------- */

/**
 * Where the meeting happens: the host's own room when they set one,
 * otherwise a fresh Jitsi room nobody can guess.
 */
export const meetingRoomFor = (
  profile: MeetProfile,
  host: Omit<HostUser, 'id'>,
) =>
  profile.meetingUrl ||
  `https://meet.jit.si/${slugify(hostName(host)).slice(0, 24)}-${randomBytes(6).toString('hex')}`;

/* ------------------------------- applicants ------------------------------ */

/**
 * The guest's latest application to a company the host belongs to, so an
 * interview booking shows up on the hiring board too.
 */
export async function findApplicationFor(
  hostId: string,
  email: string,
): Promise<{ application: JobApplication; role: string } | null> {
  const memberships: Array<{ companyId: string }> =
    await db.companyMember.findMany({
      where: { userId: hostId, status: MEMBER_STATUS.ACTIVE },
      select: { companyId: true },
    });
  if (!memberships.length) return null;
  const application: JobApplication | null = await db.jobApplication.findFirst({
    where: {
      email,
      companyId: { in: memberships.map((m) => m.companyId) },
    },
    orderBy: { submittedAt: 'desc' },
  });
  if (!application) return null;
  const opening: JobOpening | null = await db.jobOpening.findFirst({
    where: { id: application.openingId },
  });
  return { application, role: opening?.title ?? '' };
}

/* ------------------------------ rate limiting ---------------------------- */

const recent = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;

/**
 * Best-effort cap on booking requests per client address (in this server's
 * memory, so it slows scripts down rather than guaranteeing anything).
 */
export function isBookingRateLimited(clientKey: string): boolean {
  const now = Date.now();
  const hits = (recent.get(clientKey) ?? []).filter((t) => now - t < WINDOW_MS);
  const limited = hits.length >= MAX_PER_WINDOW;
  if (!limited) hits.push(now);
  recent.set(clientKey, hits);
  if (recent.size > 5000) {
    for (const [key, times] of Array.from(recent.entries()))
      if (times.every((t) => now - t >= WINDOW_MS)) recent.delete(key);
  }
  return limited;
}
