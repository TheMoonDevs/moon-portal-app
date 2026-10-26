import { NextResponse } from 'next/server';

import { OAUTH_SCOPE } from '@/lib/mcp/oauth';
import { originOf } from '@/lib/mcp/tokens';

export const dynamic = 'force-dynamic';

/** Served at /.well-known/oauth-protected-resource (see next.config.mjs). */
export async function GET(request: Request) {
  const origin = originOf(request);
  return NextResponse.json(
    {
      resource: `${origin}/api/mcp`,
      authorization_servers: [origin],
      scopes_supported: [OAUTH_SCOPE],
      bearer_methods_supported: ['header'],
      resource_name: 'Portal',
    },
    { headers: { 'Access-Control-Allow-Origin': '*' } },
  );
}
