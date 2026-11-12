import { createApiToken, randomSecret, sha256 } from '@/lib/mcp/tokens';
import { db } from '@/lib/mongodb/db-client';
import type { SessionUser } from '@/lib/permissions/server';
import { sessionUserFromRecord } from '@/lib/permissions/server';
import type { ApiToken } from '@/models/connections';

/*
 * Sign-in for the portal's own mobile app (`/mobile` in this repo).
 *
 * The app signs in the same way as the website (sign-in code + Google, see
 * lib/auth/signIn.ts) and gets a token it keeps in the phone's secure
 * storage. One token is one signed-in phone: it shows under Settings with the
 * other connections, where it can be signed out, and it holds that phone's
 * push token. The app renews it while in use, so people who open the app at
 * least every few months stay signed in.
 */

/** Marks tokens that belong to the mobile app, in `ApiToken.clientId`. */
export const MOBILE_CLIENT_ID = 'portal-mobile';
/** Mobile tokens look different from assistant tokens (`pmcp_`). */
export const MOBILE_TOKEN_PREFIX = 'pmob_';
/** How long a token lasts from its last renewal. */
export const MOBILE_TOKEN_DAYS = 180;

const BEARER = /^Bearer\s+(pmob_\S+)$/i;

/** The raw mobile token in an Authorization header, if there is one. */
export function mobileTokenFromHeader(header: string | null | undefined) {
  return header?.match(BEARER)?.[1] ?? null;
}

const isLive = (token: ApiToken | null): token is ApiToken =>
  !!token &&
  token.clientId === MOBILE_CLIENT_ID &&
  !token.revokedAt &&
  (!token.expiresAt || new Date(token.expiresAt) > new Date());

async function findLiveToken(raw: string) {
  const token: ApiToken | null = await db.apiToken.findFirst({
    where: { tokenHash: sha256(raw) },
  });
  return isLive(token) ? token : null;
}

/**
 * The user behind a mobile app's `Authorization: Bearer pmob_…` header, or
 * null when the token is unknown, signed out, expired, or its user is no
 * longer active.
 */
export async function userFromMobileHeader(
  header: string | null | undefined,
): Promise<{ user: SessionUser; token: ApiToken } | null> {
  const raw = mobileTokenFromHeader(header);
  if (!raw) return null;
  const token = await findLiveToken(raw);
  if (!token) return null;

  const record = await db.user.findFirst({ where: { id: token.userId } });
  // The Google account checked at sign-in, as for a website session.
  const user = await sessionUserFromRecord(
    record,
    typeof token.googleEmail === 'string' ? token.googleEmail : null,
  );
  if (!user) return null;

  // Note when it was last used, at most once an hour.
  const last = token.lastUsedAt ? new Date(token.lastUsedAt).getTime() : 0;
  if (Date.now() - last > 3600000) {
    await db.apiToken.update({
      where: { id: token.id },
      data: { lastUsedAt: new Date().toISOString() },
    });
  }
  return { user, token };
}

export type MobileDevice = {
  /** e.g. "Subhakar's iPhone"; shown in Settings. */
  name?: string;
  platform?: 'ios' | 'android' | string;
};

const deviceLabel = (device?: MobileDevice) => {
  const name = device?.name?.trim().slice(0, 40);
  const platform =
    device?.platform === 'ios'
      ? 'iPhone'
      : device?.platform === 'android'
        ? 'Android'
        : 'phone';
  return `Portal app · ${name || platform}`;
};

/** A new token for a phone that just signed in. */
export async function issueMobileToken(
  userId: string,
  googleEmail: string,
  device?: MobileDevice,
) {
  const { token, record } = await createApiToken({
    userId,
    name: deviceLabel(device),
    clientId: MOBILE_CLIENT_ID,
    days: MOBILE_TOKEN_DAYS,
    prefix: MOBILE_TOKEN_PREFIX,
    extra: {
      googleEmail,
      platform: device?.platform ?? null,
      expoPushToken: null,
    },
  });
  return { token, expiresAt: record.expiresAt ?? null };
}

/**
 * Swaps a live token for a fresh one on the same record, so the phone stays
 * in the same row in Settings and keeps its push token. The old token stops
 * working at once.
 */
export async function renewMobileToken(token: ApiToken) {
  const raw = `${MOBILE_TOKEN_PREFIX}${randomSecret()}`;
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + MOBILE_TOKEN_DAYS * 86400000,
  ).toISOString();
  await db.apiToken.update({
    where: { id: token.id },
    data: {
      tokenHash: sha256(raw),
      prefix: raw.slice(0, MOBILE_TOKEN_PREFIX.length + 4),
      expiresAt,
      updatedAt: now.toISOString(),
    },
  });
  return { token: raw, expiresAt };
}

/** Signs a phone out: its token and push token stop working. */
export async function revokeMobileToken(token: ApiToken) {
  const now = new Date().toISOString();
  await db.apiToken.update({
    where: { id: token.id },
    data: { revokedAt: now, expoPushToken: null, updatedAt: now },
  });
}

/** Expo push tokens look like `ExponentPushToken[…]` (or `ExpoPushToken[…]`). */
export const isExpoPushToken = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length < 200 &&
  /^Expo(nent)?PushToken\[[^\]]+\]$/.test(value);

/**
 * Remembers where to send this phone's notifications. A push token moves to
 * the newest sign-in that reports it, so a phone never gets the same
 * notification twice after signing in again.
 */
export async function saveExpoPushToken(token: ApiToken, pushToken: string) {
  const now = new Date().toISOString();
  const others: ApiToken[] = await db.apiToken.findMany({
    where: { clientId: MOBILE_CLIENT_ID, expoPushToken: pushToken },
  });
  await Promise.all(
    others
      .filter((t) => t.id !== token.id)
      .map((t) =>
        db.apiToken.update({
          where: { id: t.id },
          data: { expoPushToken: null, updatedAt: now },
        }),
      ),
  );
  await db.apiToken.update({
    where: { id: token.id },
    data: { expoPushToken: pushToken, updatedAt: now },
  });
}

/** Stops notifications to this phone (the person turned them off). */
export async function clearExpoPushToken(token: ApiToken) {
  await db.apiToken.update({
    where: { id: token.id },
    data: { expoPushToken: null, updatedAt: new Date().toISOString() },
  });
}
