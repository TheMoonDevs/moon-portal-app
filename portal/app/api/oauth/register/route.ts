import { NextResponse } from 'next/server';

import { isAllowedRedirect } from '@/lib/mcp/oauth';
import { randomSecret } from '@/lib/mcp/tokens';
import { db } from '@/lib/mongodb/db-client';

export const dynamic = 'force-dynamic';

const error = (description: string) =>
  NextResponse.json(
    { error: 'invalid_client_metadata', error_description: description },
    { status: 400 },
  );

/**
 * Dynamic client registration: an app (Claude, an IDE…) registers itself
 * before asking a person to connect. Registering grants nothing on its own;
 * the person still signs in and approves.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const uris: unknown[] = Array.isArray(body?.redirect_uris)
    ? body.redirect_uris
    : [];
  if (!uris.length || uris.length > 10 || !uris.every(isAllowedRedirect))
    return error('redirect_uris must be https URLs (or http on localhost).');

  const name =
    typeof body?.client_name === 'string' && body.client_name.trim()
      ? body.client_name.trim().slice(0, 60)
      : 'AI assistant';
  const clientId = `pc_${randomSecret(16)}`;
  const now = new Date().toISOString();
  await db.oauthClient.create({
    data: {
      clientId,
      name,
      redirectUris: uris,
      createdAt: now,
      updatedAt: now,
    },
  });
  return NextResponse.json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: name,
      redirect_uris: uris,
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    },
    { status: 201, headers: { 'Access-Control-Allow-Origin': '*' } },
  );
}
