import { PORTAL_URL } from './config';

/** A failed call to the portal, with the portal's own message. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

let token: string | null = null;
let onSignedOut: (() => void) | null = null;

/** The token sent with every call; set by the auth provider. */
export function setApiToken(value: string | null) {
  token = value;
}

/** Headers that open portal files the app shows (chat photos). */
export function authHeaders(): Record<string, string> {
  return token ? { authorization: `Bearer ${token}` } : {};
}

/** Called when the portal says the token no longer works. */
export function setOnSignedOut(handler: (() => void) | null) {
  onSignedOut = handler;
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** A file upload: sent as multipart instead of JSON. */
  form?: FormData;
  /** Leave the token off (sign-in). */
  anonymous?: boolean;
};

/** A path with its query string, leaving out empty values. */
export function withQuery(path: string, query: Record<string, string | number | null | undefined>) {
  const parts = Object.entries(query)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `${path}?${parts.join('&')}` : path;
}

/** A portal address for something the app opens outside itself. */
export const portalUrl = (path: string) =>
  /^https?:\/\//.test(path) ? path : `${PORTAL_URL}${path.startsWith('/') ? '' : '/'}${path}`;

/**
 * Calls the portal API. Portal routes answer `{ status, data }` or
 * `{ status: 'fail', error }`; this returns `data` or throws an ApiError.
 */
export async function api<T>(
  path: string,
  { method = 'GET', body, form, anonymous }: Options = {},
): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token && !anonymous) headers.authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${PORTAL_URL}${path}`, {
      method: form && method === 'GET' ? 'POST' : method,
      headers,
      body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
  } catch {
    throw new ApiError('Can’t reach the portal. Check your connection.', 0);
  }

  const json = await res.json().catch(() => null);
  if (!res.ok || json?.status === 'fail') {
    if (res.status === 401 && token && !anonymous) onSignedOut?.();
    throw new ApiError(
      json?.error || json?.message || `The portal answered ${res.status}.`,
      res.status,
      json?.code,
    );
  }
  return (json && 'data' in json ? json.data : json) as T;
}

/** An error's message for the screen. */
export const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong.';
