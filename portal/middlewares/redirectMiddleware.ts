import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from 'next/server';

import { CustomMiddleware } from './chain';

export function withRedirectMiddleware(middleware: CustomMiddleware) {
  return async (
    request: NextRequest,
    event: NextFetchEvent,
    response: NextResponse,
  ) => {
    const cookieResponse = await fetch(
      `${request.nextUrl.origin}/api/auth/session`,
      {
        headers: {
          Cookie: request.headers.get('cookie') || '',
        },
      },
    );

    const fetchedSession = await cookieResponse.json();
    const sessionToken =
      request.cookies.get('next-auth.session-token') ||
      request.cookies.get('__Secure-next-auth.session-token');
    const pathname = request.nextUrl.pathname;
    const nextUrl = request.nextUrl;

    if (
      (!sessionToken || !fetchedSession.user) &&
      pathname !== '/' &&
      !pathname.startsWith('/login') &&
      !pathname.startsWith('/api/auth') &&
      !pathname.startsWith('/api')
    ) {
      const loginUrl = new URL('/login', nextUrl.origin);
      loginUrl.searchParams.set('uri', request.url);

      return NextResponse.redirect(loginUrl.toString());
    }

    // Call the next middleware and pass the request and response
    return middleware(request, event, response);
  };
}
