import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Routes called by external systems that authenticate themselves differently.
const EXEMPT_PREFIXES = ['/api/auth', '/api/slack'];

export const rejectIfApiKeyMissing = (request: NextRequest) => {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) return null;

  const { pathname } = request.nextUrl;
  if (EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix)))
    return null;

  const apiKey = request.headers.get('tmd_portal_api_key');
  if (apiKey === process.env.NEXT_PUBLIC_TMD_PORTAL_API_KEY) return null;

  return NextResponse.json(
    { error: 'Invalid or missing API key' },
    { status: 401 },
  );
};
