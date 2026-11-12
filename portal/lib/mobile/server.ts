import {
  LOGIN_ERROR_MESSAGES,
  LOGIN_ERRORS,
} from '@/lib/auth/loginErrors';
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
  positionTitle: record.positionTitle ?? null,
  timezone: record.timezone ?? null,
  appleLinked: !!record.appleSub,
  deletionRequestedAt: record.deletionRequestedAt ?? null,
});

/** A failed sign-in, with the same error codes the website's login uses. */
export const refusedSignIn = (code: string) =>
  Response.json(
    {
      status: 'fail',
      code,
      error: LOGIN_ERROR_MESSAGES[code] ?? 'Sign-in failed.',
    },
    { status: code === LOGIN_ERRORS.INACTIVE ? 403 : 401 },
  );

/** The phone a sign-in came from, as the app sends it. */
export const deviceFrom = (body: any) => {
  const platform = body?.device?.platform;
  return {
    name: typeof body?.device?.name === 'string' ? body.device.name : '',
    platform:
      platform === 'ios' || platform === 'android' ? platform : undefined,
  };
};
