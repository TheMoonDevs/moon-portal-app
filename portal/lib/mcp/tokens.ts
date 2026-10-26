import { createHash, randomBytes } from 'crypto';

import { db } from '@/lib/mongodb/db-client';
import type { SessionUser } from '@/lib/permissions/server';
import { sessionUserFromRecord } from '@/lib/permissions/server';
import type { ApiToken } from '@/models/connections';

const TOKEN_PREFIX = 'pmcp_';
/** Tokens from OAuth connections; people reconnect after this. */
export const OAUTH_TOKEN_DAYS = 180;

export const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

export const randomSecret = (bytes = 32) =>
  randomBytes(bytes).toString('base64url');

/** Creates a token for `userId`. The raw token is returned only here. */
export async function createApiToken({
  userId,
  name,
  clientId = null,
  days = null,
}: {
  userId: string;
  name: string;
  clientId?: string | null;
  days?: number | null;
}) {
  const token = `${TOKEN_PREFIX}${randomSecret()}`;
  const now = new Date();
  const record: ApiToken = await db.apiToken.create({
    data: {
      userId,
      name: name.trim().slice(0, 60) || 'Token',
      tokenHash: sha256(token),
      prefix: token.slice(0, TOKEN_PREFIX.length + 4),
      clientId,
      expiresAt: days
        ? new Date(now.getTime() + days * 86400000).toISOString()
        : null,
      lastUsedAt: null,
      revokedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  });
  return { token, record };
}

/**
 * The user behind an `Authorization: Bearer` token, or null when the token is
 * unknown, revoked, expired or its user is no longer active.
 */
export async function userFromBearer(
  request: Request,
): Promise<{ user: SessionUser; token: ApiToken } | null> {
  const header = request.headers.get('authorization') ?? '';
  const raw = header.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!raw || !raw.startsWith(TOKEN_PREFIX)) return null;

  const token: ApiToken | null = await db.apiToken.findFirst({
    where: { tokenHash: sha256(raw) },
  });
  if (!token || token.revokedAt) return null;
  if (token.expiresAt && new Date(token.expiresAt) < new Date()) return null;

  const record = await db.user.findFirst({ where: { id: token.userId } });
  const user = await sessionUserFromRecord(record);
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

/** The portal's public origin, as the caller reached it. */
export function originOf(request: Request) {
  const url = new URL(request.url);
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0] ??
    url.protocol.replace(':', '');
  return host ? `${proto}://${host}` : url.origin;
}
