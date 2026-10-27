import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { rejectIfApiKeyMissing } from '@/middlewares/apiKey';
import { applyCorsHeaders } from '@/middlewares/cors';

// `/apply/<slug>` is where candidates fill in a job application, and
// `/task/<token>` their take-home task. `/policies` is the codes we work by.
// `/~offline` is cached by the service worker for when there's no network.
const PUBLIC_PAGES = [
  '/login',
  '/logout',
  '/apply',
  '/task',
  '/policies',
  '/~offline',
];
// Booking links (`/meet/<code>`) and guests' manage links are open to anyone;
// `/meet` itself, where people set up their link, is not.
const PUBLIC_PREFIXES = ['/meet/'];

const isPublicPage = (pathname: string) =>
  PUBLIC_PAGES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  ) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  if (pathname.startsWith('/api')) {
    // Assistant endpoints set their own CORS headers.
    if (!pathname.startsWith('/api/mcp') && !pathname.startsWith('/api/oauth'))
      applyCorsHeaders(request, response);
    return rejectIfApiKeyMissing(request) ?? response;
  }

  if (isPublicPage(pathname)) return response;

  // Derive the cookie name from the actual request rather than NEXTAUTH_URL,
  // so the guard still works behind a proxy or on a preview domain.
  const secureCookie =
    request.nextUrl.protocol === 'https:' ||
    request.headers.get('x-forwarded-proto') === 'https';

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie,
  });
  if (token) return response;

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('uri', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/api/:path*',
    // every page except Next internals and files with an extension
    // (manifest.webmanifest, sw.js, images, fonts, …)
    '/((?!api|_next/static|_next/image|.*\\.).*)',
  ],
};
