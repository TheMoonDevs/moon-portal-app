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
    const sessionToken =
      request.cookies.get('next-auth.session-token') ||
      request.cookies.get('__Secure-next-auth.session-token');
    const pathname = request.nextUrl.pathname;
    const nextUrl = request.nextUrl;

    if (
      !sessionToken &&
      pathname !== '/' &&
      !pathname.startsWith('/login') &&
      !pathname.startsWith('/api/auth') &&
      !pathname.startsWith('/api')
    ) {
      const loginUrl = new URL('/login', nextUrl.origin);
      loginUrl.searchParams.set('uri', nextUrl.href);

      return NextResponse.redirect(loginUrl.toString());
    }

    // Call the next middleware and pass the request and response
    return middleware(request, event, response);
  };
}
