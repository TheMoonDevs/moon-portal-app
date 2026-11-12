import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Routes called by external systems that authenticate themselves differently:
// sign-in, AI assistants (bearer tokens, OAuth) and Resend's signed delivery
// webhook. Approving an assistant at /api/oauth/authorize still needs the key.
const EXEMPT_PREFIXES = [
  '/api/auth',
  '/api/mcp',
  '/api/oauth/token',
  '/api/oauth/register',
  '/api/hiring/emails/webhook',
  // The service worker confirms chat notifications; it can't send the key.
  '/api/chat/push-ack',
  // The mobile app signs in with a sign-in code + Google (lib/auth/signIn.ts).
  '/api/mobile/auth/sign-in',
];

// The mobile app sends its own token instead of the shared key; every route
// still checks the token itself (getSessionUser, lib/mobile/auth.ts).
const MOBILE_BEARER = /^Bearer\s+pmob_\S+$/i;

export const rejectIfApiKeyMissing = (request: NextRequest) => {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) return null;

  const { pathname } = request.nextUrl;
  if (EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix)))
    return null;
  if (MOBILE_BEARER.test(request.headers.get('authorization') ?? ''))
    return null;

  const apiKey = request.headers.get('tmd_portal_api_key');
  if (apiKey === process.env.NEXT_PUBLIC_TMD_PORTAL_API_KEY) return null;

  return NextResponse.json(
    { error: 'Invalid or missing API key' },
    { status: 401 },
  );
};
