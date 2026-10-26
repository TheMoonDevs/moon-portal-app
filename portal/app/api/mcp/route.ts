import { NextResponse } from 'next/server';

import { handleRpc, unauthorized } from '@/lib/mcp/server';
import { userFromBearer } from '@/lib/mcp/tokens';

export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'WWW-Authenticate, Mcp-Session-Id',
};

/**
 * The portal's MCP server (streamable HTTP, stateless JSON responses). Each
 * request carries the person's token; every tool acts as that person.
 */
export async function POST(request: Request) {
  const auth = await userFromBearer(request);
  if (!auth) return unauthorized(request, CORS);

  const body = await request.json().catch(() => undefined);
  if (body === undefined)
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' },
      },
      { status: 400, headers: CORS },
    );

  const messages = Array.isArray(body) ? body : [body];
  const replies = (
    await Promise.all(messages.map((m) => handleRpc(auth.user, m)))
  ).filter(Boolean);
  // Only notifications: nothing to say back.
  if (!replies.length)
    return new NextResponse(null, { status: 202, headers: CORS });
  return NextResponse.json(Array.isArray(body) ? replies : replies[0], {
    headers: CORS,
  });
}

/** No server-to-client stream: everything is a plain response. */
export async function GET() {
  return new NextResponse(null, {
    status: 405,
    headers: { ...CORS, Allow: 'POST' },
  });
}

export async function DELETE() {
  return new NextResponse(null, {
    status: 405,
    headers: { ...CORS, Allow: 'POST' },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...CORS,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version',
    },
  });
}
