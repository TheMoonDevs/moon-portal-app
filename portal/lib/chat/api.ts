import type { NextResponse } from 'next/server';

import type { SessionUser } from '@/lib/permissions/server';
import { fail, ok, requireUser } from '@/lib/workspace/server';

import { ChatError } from './server';

/**
 * Runs a chat endpoint for the signed-in user. Whatever it returns is sent
 * as `data`; a ChatError becomes its status and message.
 */
export async function chatRoute(
  handler: (user: SessionUser) => Promise<unknown>,
): Promise<NextResponse> {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  try {
    const data = await handler(user);
    return ok(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof ChatError) return fail(error.status, error.message);
    console.error('[chat]', error);
    return fail(500, 'Something went wrong.');
  }
}

export const readJson = async (request: Request) =>
  (await request.json().catch(() => ({}))) as Record<string, any>;
