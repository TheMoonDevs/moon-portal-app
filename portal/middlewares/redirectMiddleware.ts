import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from 'next/server';

import { CustomMiddleware } from './chain';
import { getToken } from 'next-auth/jwt';

export function withRedirectMiddleware(middleware: CustomMiddleware) {
  return async (
    request: NextRequest,
    event: NextFetchEvent,
    response: NextResponse,
  ) => {
    try {
      const fetchedSession = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });
      // const cookieResponse = await fetch(
      //   `${request.nextUrl.origin}/api/auth/session`,
      // );

      // const fetchedSession = await cookieResponse.json();

      const sessionToken =
        request.cookies.get('next-auth.session-token') ||
        request.cookies.get('__Secure-next-auth.session-token');
      const pathname = request.nextUrl.pathname;
      const nextUrl = request.nextUrl;

      if (
        (!sessionToken || !fetchedSession) &&
        pathname !== '/' &&
        !pathname.startsWith('/login') &&
        !pathname.startsWith('/api/auth') &&
        !pathname.startsWith('/api')
      ) {
        const loginUrl = new URL('/login', nextUrl.origin);
        loginUrl.searchParams.set('uri', request.url);
        console.log('loginUrl', loginUrl);
        return NextResponse.redirect(loginUrl.toString());
      }
    } catch (e) {
      console.log(e);
    }

    // Call the next middleware and pass the request and response
    return middleware(request, event, response);
  };
}
