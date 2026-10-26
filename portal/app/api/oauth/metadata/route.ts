import { NextResponse } from 'next/server';

import { authServerMetadata } from '@/lib/mcp/oauth';
import { originOf } from '@/lib/mcp/tokens';

export const dynamic = 'force-dynamic';

/** Served at /.well-known/oauth-authorization-server (see next.config.js). */
export async function GET(request: Request) {
  return NextResponse.json(authServerMetadata(originOf(request)), {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
