import { NextResponse } from 'next/server';

import {
  getSignInEmails,
  GoogleTokenError,
  verifyGoogleIdToken,
} from '@/lib/auth/googleIdToken';
import { db } from '@/lib/mongodb/db-client';
import { getSessionUser } from '@/lib/permissions/server';

export const dynamic = 'force-dynamic';

const fail = (status: number, error: string) =>
  NextResponse.json({ status: 'fail', error }, { status });

/** Link another Google account to the signed-in user, after proving it. */
export async function POST(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');

  const { idToken } = await request.json().catch(() => ({}));
  if (typeof idToken !== 'string' || !idToken) {
    return fail(400, 'Google sign-in is required.');
  }

  let email: string;
  try {
    email = await verifyGoogleIdToken(idToken);
  } catch (e) {
    if (e instanceof GoogleTokenError) return fail(400, e.message);
    throw e;
  }

  const user = await db.user.findFirst({ where: { id: actor.id } });
  if (!user) return fail(404, 'User not found.');
  if (getSignInEmails(user).includes(email)) {
    return NextResponse.json({ status: 'success', data: { user } });
  }

  const updated = await db.user.update({
    where: { id: actor.id },
    data: {
      linkedEmails: [...(user.linkedEmails ?? []), email],
      updatedAt: new Date(),
    },
  });
  return NextResponse.json({ status: 'success', data: { user: updated } });
}

/** Unlink a Google account. The primary email cannot be removed here. */
export async function DELETE(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');

  const { email } = await request.json().catch(() => ({}));
  const target = typeof email === 'string' ? email.trim().toLowerCase() : '';

  const user = await db.user.findFirst({ where: { id: actor.id } });
  if (!user) return fail(404, 'User not found.');
  if (target === user.email?.trim().toLowerCase()) {
    return fail(400, 'Your main email cannot be unlinked.');
  }

  const updated = await db.user.update({
    where: { id: actor.id },
    data: {
      linkedEmails: (user.linkedEmails ?? []).filter(
        (e: string) => e.trim().toLowerCase() !== target,
      ),
      updatedAt: new Date(),
    },
  });
  return NextResponse.json({ status: 'success', data: { user: updated } });
}
