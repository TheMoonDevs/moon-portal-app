import { createApiToken } from '@/lib/mcp/tokens';
import { db } from '@/lib/mongodb/db-client';
import { fail, nowIso, ok, requireUser } from '@/lib/workspace/server';
import type { ApiToken } from '@/models/connections';

export const dynamic = 'force-dynamic';

/** Tokens made by hand last a year; people can revoke them any time. */
const MANUAL_TOKEN_DAYS = 365;

const view = (t: ApiToken) => ({
  id: t.id,
  name: t.name,
  prefix: t.prefix,
  viaOAuth: !!t.clientId,
  createdAt: t.createdAt,
  lastUsedAt: t.lastUsedAt ?? null,
  expiresAt: t.expiresAt ?? null,
});

/** The caller's connected assistants and tokens that still work. */
export async function GET() {
  const { response, user } = await requireUser();
  if (response || !user) return response ?? fail(401, 'Sign in first.');
  const tokens: ApiToken[] = await db.apiToken.findMany({
    where: { userId: user.id, revokedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  const now = new Date();
  return ok({
    tokens: tokens
      .filter((t) => !t.expiresAt || new Date(t.expiresAt) > now)
      .map(view),
  });
}

/** Makes a token for an app that takes one in a header. Shown once. */
export async function POST(request: Request) {
  const { response, user } = await requireUser();
  if (response || !user) return response ?? fail(401, 'Sign in first.');
  const body = await request.json().catch(() => ({}));
  const name =
    typeof body.name === 'string' && body.name.trim()
      ? body.name.trim()
      : 'Claude';
  const active = await db.apiToken.findMany({
    where: { userId: user.id, revokedAt: null },
    select: { id: true },
  });
  if (active.length >= 20)
    return fail(400, 'You have 20 connections. Remove one first.');
  const { token, record } = await createApiToken({
    userId: user.id,
    name,
    days: MANUAL_TOKEN_DAYS,
  });
  return ok({ token, record: view(record) }, { status: 201 });
}

/** Disconnects an assistant: `{ id }`. */
export async function DELETE(request: Request) {
  const { response, user } = await requireUser();
  if (response || !user) return response ?? fail(401, 'Sign in first.');
  const body = await request.json().catch(() => ({}));
  if (typeof body.id !== 'string' || !body.id)
    return fail(400, 'Which connection?');
  const revoked = await db.apiToken.updateMany({
    where: { id: body.id, userId: user.id, revokedAt: null },
    data: { revokedAt: nowIso(), updatedAt: nowIso() },
  });
  if (!revoked.count) return fail(404, 'That connection is already gone.');
  return ok({ id: body.id });
}
