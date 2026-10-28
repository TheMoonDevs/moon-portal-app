import { NextResponse } from 'next/server';

import {
  DEFAULT_DIGEST_FREQUENCY,
  isDigestFrequency,
} from '@/lib/hiring/digestFrequency';
import { db } from '@/lib/mongodb/db-client';
import { getSessionUser } from '@/lib/permissions/server';

export const dynamic = 'force-dynamic';

const fail = (status: number, error: string) =>
  NextResponse.json({ status: 'fail', error }, { status });

/** The signed-in person's hiring preferences: how often they get the digest. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail(401, 'Authentication required.');
  const record = await db.user.findFirst({ where: { id: user.id } });
  return NextResponse.json({
    status: 'success',
    data: {
      digest: isDigestFrequency(record?.hiringDigest)
        ? record.hiringDigest
        : DEFAULT_DIGEST_FREQUENCY,
    },
  });
}

/** Saves them (body: `{ digest }`). */
export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => null);
  if (!isDigestFrequency(body?.digest)) return fail(400, 'Unknown frequency.');
  await db.user.update({
    where: { id: user.id },
    data: { hiringDigest: body.digest },
  });
  return NextResponse.json({
    status: 'success',
    data: { digest: body.digest },
  });
}
