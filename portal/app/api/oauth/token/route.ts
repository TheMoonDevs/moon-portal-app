import { createHash } from 'crypto';
import { NextResponse } from 'next/server';

import { createApiToken, OAUTH_TOKEN_DAYS, sha256 } from '@/lib/mcp/tokens';
import { db } from '@/lib/mongodb/db-client';
import type { OAuthClient, OAuthCode } from '@/models/connections';

export const dynamic = 'force-dynamic';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
};

const error = (code: string, description: string, status = 400) =>
  NextResponse.json(
    { error: code, error_description: description },
    { status, headers },
  );

async function readBody(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/json'))
    return (await request.json().catch(() => ({}))) ?? {};
  const form = new URLSearchParams(await request.text());
  return Object.fromEntries(form.entries());
}

/** Swaps a one-time code (with its PKCE verifier) for an access token. */
export async function POST(request: Request) {
  const body = await readBody(request);
  if (body.grant_type !== 'authorization_code')
    return error(
      'unsupported_grant_type',
      'Only authorization_code is supported.',
    );
  if (!body.code || !body.code_verifier || !body.client_id)
    return error(
      'invalid_request',
      'code, code_verifier and client_id are required.',
    );

  const code: OAuthCode | null = await db.oauthCode.findFirst({
    where: { codeHash: sha256(body.code) },
  });
  if (
    !code ||
    code.usedAt ||
    new Date(code.expiresAt) < new Date() ||
    code.clientId !== body.client_id ||
    (body.redirect_uri && body.redirect_uri !== code.redirectUri)
  )
    return error('invalid_grant', 'The code is invalid or has expired.');

  const challenge = createHash('sha256')
    .update(body.code_verifier)
    .digest('base64url');
  if (challenge !== code.codeChallenge)
    return error('invalid_grant', 'The code verifier does not match.');

  // One use only: claim it before issuing anything.
  const claimed = await db.oauthCode.updateMany({
    where: { id: code.id, usedAt: null },
    data: { usedAt: new Date().toISOString() },
  });
  if (!claimed.count)
    return error('invalid_grant', 'The code was already used.');

  const client: OAuthClient | null = await db.oauthClient.findFirst({
    where: { clientId: code.clientId },
  });
  const { token } = await createApiToken({
    userId: code.userId,
    name: client?.name ?? 'AI assistant',
    clientId: code.clientId,
    days: OAUTH_TOKEN_DAYS,
  });
  return NextResponse.json(
    {
      access_token: token,
      token_type: 'Bearer',
      expires_in: OAUTH_TOKEN_DAYS * 86400,
      scope: 'worklogs',
    },
    { headers },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...headers,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
