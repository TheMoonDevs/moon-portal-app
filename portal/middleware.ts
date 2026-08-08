import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { rejectIfApiKeyMissing } from '@/middlewares/apiKey';
import { applyCorsHeaders } from '@/middlewares/cors';

const PUBLIC_PAGES = ['/login', '/logout'];

const isPublicPage = (pathname: string) =>
  PUBLIC_PAGES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  if (pathname.startsWith('/api')) {
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
    // (manifest.json, sw.js, images, fonts, …)
    '/((?!api|_next/static|_next/image|.*\\.).*)',
  ],
};
