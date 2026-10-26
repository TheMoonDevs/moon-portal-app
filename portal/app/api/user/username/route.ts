import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getSessionUser } from '@/lib/permissions/server';
import { checkUsername, suggestUsername } from '@/lib/users/server';
import { normalizeUsername } from '@/lib/users/username';

/**
 * Check a username while someone types it.
 *
 *   GET /api/user/username?username=jane&userId=…   → is it valid and free?
 *   GET /api/user/username?name=Jane Doe&email=…   → a free suggestion
 *
 * `userId` is the person being edited, so their own current username counts
 * as available.
 */
export async function GET(request: NextRequest) {
  const actor = await getSessionUser();
  if (!actor) {
    return NextResponse.json(
      { status: 'fail', error: 'Authentication required.' },
      { status: 401 },
    );
  }

  const params = request.nextUrl.searchParams;
  const userId = params.get('userId') || undefined;

  if (!params.has('username')) {
    const suggestion = await suggestUsername(
      params.get('name'),
      params.get('email'),
      userId,
    );
    return NextResponse.json({ status: 'success', data: { suggestion } });
  }

  const username = normalizeUsername(params.get('username'));
  const problem = await checkUsername(username, userId);
  return NextResponse.json({
    status: 'success',
    data: { username, available: !problem, problem },
  });
}
