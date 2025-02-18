import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from 'next/server';

import { CustomMiddleware } from './chain';

// Config
const corsOptions: {
  allowedMethods: string[];
  allowedOrigins: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge?: number;
  credentials: boolean;
} = {
  allowedMethods: (process.env?.ALLOWED_METHODS || '').split(','),
  allowedOrigins: (process.env?.ALLOWED_ORIGIN || '').split(','),
  allowedHeaders: (process.env?.ALLOWED_HEADERS || '').split(','),
  exposedHeaders: (process.env?.EXPOSED_HEADERS || '').split(','),
  maxAge: (process.env?.MAX_AGE && parseInt(process.env?.MAX_AGE)) || undefined, // 60 * 60 * 24 * 30, // 30 days
  credentials: process.env?.CREDENTIALS == 'true',
};
export function withAuthMiddleware(middleware: CustomMiddleware) {
  return async (request: NextRequest, event: NextFetchEvent) => {
    // The first middleware in the chain has to create the response
    // object and pass it down the chain.
    const response = NextResponse.next();
    // Allowed origins check
    const origin = request.headers.get('origin') ?? '';
    if (origin === '') {
      response.headers.set('Access-Control-Allow-Origin', '*');
    } else if (
      corsOptions.allowedOrigins.includes('*') ||
      corsOptions.allowedOrigins.includes(origin)
    ) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else {
      response.headers.set('Access-Control-Allow-Origin', '*');
    }

    // console.log(
    //   'Origin:',
    //   origin,
    //   'headers:',
    //   response.headers,
    //   'allowed:',
    //   corsOptions.allowedHeaders,
    // );

    // Set default CORS headers
    response.headers.set(
      'Access-Control-Allow-Credentials',
      corsOptions.credentials.toString(),
    );
    response.headers.set(
      'Access-Control-Allow-Methods',
      corsOptions.allowedMethods.join(','),
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      corsOptions.allowedHeaders.join(','),
    );
    response.headers.set(
      'Access-Control-Expose-Headers',
      corsOptions.exposedHeaders.join(','),
    );
    response.headers.set(
      'Access-Control-Max-Age',
      corsOptions.maxAge?.toString() ?? '',
    );

    // Check API key for methods that modify the database
    const method = request.method.toUpperCase();
    const modifyingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    if (
      modifyingMethods.includes(method) &&
      !request.url.includes('/api/auth') &&
      !request.url.includes('/api/slack') &&
      !request.url.includes('/api/client-survey')
    ) {
      const apiKey = request.headers.get('tmd_portal_api_key');
      const expectedApiKey = process.env.NEXT_PUBLIC_TMD_PORTAL_API_KEY;

      // console.log("API KEY >>>>>>>>>>>>>>>>>>>");
      // console.log(apiKey);
      // console.log(expectedApiKey);
      // console.log("API KEY >>>>>>>>>>>>>>>>>>>");

      if (apiKey !== expectedApiKey) {
        return new NextResponse(
          JSON.stringify({ error: 'Invalid or missing API key' }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );
      }
    }

    // Call the next middleware and pass the request and response
    return middleware(request, event, response);
  };
}
