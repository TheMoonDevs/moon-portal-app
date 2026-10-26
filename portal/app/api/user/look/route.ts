import { NextResponse } from 'next/server';

import { saveLook } from '@/lib/avatar/server';
import { getSessionUser } from '@/lib/permissions/server';

export const dynamic = 'force-dynamic';

const fail = (status: number, error: string) =>
  NextResponse.json({ status: 'fail', error }, { status });

/** Saves the signed-in person's character look (body: `{ look }`). */
export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => null);
  const result = await saveLook(user.id, body?.look);
  if (result.errors) return fail(400, result.errors.join(' '));
  return NextResponse.json({ status: 'success', data: { look: result.look } });
}
