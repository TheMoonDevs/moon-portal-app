import { NextResponse } from 'next/server';

import { CODE_TTL_MS, isAllowedRedirect } from '@/lib/mcp/oauth';
import { randomSecret, sha256 } from '@/lib/mcp/tokens';
import { db } from '@/lib/mongodb/db-client';
import { getSessionUser } from '@/lib/permissions/server';
import type { OAuthClient } from '@/models/connections';

export const dynamic = 'force-dynamic';

const fail = (status: number, error: string) =>
  NextResponse.json({ status: 'fail', error }, { status });

async function findClient(clientId: unknown, redirectUri: unknown) {
  if (typeof clientId !== 'string') return null;
  const client: OAuthClient | null = await db.oauthClient.findFirst({
    where: { clientId },
  });
  if (!client || !isAllowedRedirect(redirectUri)) return null;
  return client.redirectUris.includes(redirectUri) ? client : null;
}

/** The app asking to connect, for the approval screen. */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return fail(401, 'Sign in first.');
  const params = new URL(request.url).searchParams;
  const client = await findClient(
    params.get('client_id'),
    params.get('redirect_uri'),
  );
  if (!client) return fail(400, 'This connection link is not valid.');
  return NextResponse.json({
    status: 'success',
    data: {
      client: { name: client.name },
      user: { name: user.name || `@${user.username}` },
    },
  });
}

/**
 * The signed-in person approves (or denies) the app. Returns the URL to send
 * the browser back to, carrying a one-time code or an error.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return fail(401, 'Sign in first.');
  const body = await request.json().catch(() => ({}));
  const client = await findClient(body.client_id, body.redirect_uri);
  if (!client) return fail(400, 'This connection link is not valid.');

  const back = new URL(body.redirect_uri);
  if (typeof body.state === 'string')
    back.searchParams.set('state', body.state);

  if (!body.approve) {
    back.searchParams.set('error', 'access_denied');
    return NextResponse.json({
      status: 'success',
      data: { redirect: back.href },
    });
  }
  if (
    typeof body.code_challenge !== 'string' ||
    body.code_challenge.length < 43 ||
    body.code_challenge_method !== 'S256'
  ) {
    back.searchParams.set('error', 'invalid_request');
    back.searchParams.set('error_description', 'PKCE (S256) is required.');
    return NextResponse.json({
      status: 'success',
      data: { redirect: back.href },
    });
  }

  const code = randomSecret();
  const now = Date.now();
  await db.oauthCode.create({
    data: {
      codeHash: sha256(code),
      clientId: client.clientId,
      userId: user.id,
      redirectUri: body.redirect_uri,
      codeChallenge: body.code_challenge,
      expiresAt: new Date(now + CODE_TTL_MS).toISOString(),
      usedAt: null,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    },
  });
  back.searchParams.set('code', code);
  return NextResponse.json({
    status: 'success',
    data: { redirect: back.href },
  });
}
