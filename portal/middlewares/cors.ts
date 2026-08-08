import type { NextRequest, NextResponse } from 'next/server';

const list = (value?: string) => (value ?? '').split(',').filter(Boolean);

const corsOptions = {
  allowedMethods: list(process.env.ALLOWED_METHODS),
  allowedOrigins: list(process.env.ALLOWED_ORIGIN),
  allowedHeaders: list(process.env.ALLOWED_HEADERS),
  exposedHeaders: list(process.env.EXPOSED_HEADERS),
  maxAge: process.env.MAX_AGE ? parseInt(process.env.MAX_AGE, 10) : undefined,
  credentials: process.env.CREDENTIALS === 'true',
};

export const applyCorsHeaders = (
  request: NextRequest,
  response: NextResponse,
) => {
  const origin = request.headers.get('origin') ?? '';
  const isAllowedOrigin =
    origin !== '' &&
    (corsOptions.allowedOrigins.includes('*') ||
      corsOptions.allowedOrigins.includes(origin));

  response.headers.set(
    'Access-Control-Allow-Origin',
    isAllowedOrigin ? origin : '*',
  );
  response.headers.set(
    'Access-Control-Allow-Credentials',
    String(corsOptions.credentials),
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
};
