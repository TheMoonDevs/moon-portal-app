import { fail } from '@/lib/workspace/server';

import { userFromMobileHeader } from './auth';

/** The mobile app's own user and token, or a 401 to send back. */
export async function requireMobileToken(request: Request) {
  const found = await userFromMobileHeader(
    request.headers.get('authorization'),
  );
  if (!found)
    return {
      response: fail(401, 'Signed out. Please sign in again.'),
      found: null,
    };
  return { response: null, found };
}

/** What the app shows about the signed-in person. */
export const mobileProfile = (record: any) => ({
  id: String(record.id),
  name: record.name || record.username || '',
  username: record.username ?? null,
  email: record.email ?? null,
  avatar: record.avatar ?? null,
});
