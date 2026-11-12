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

/** Called when the portal says the token no longer works. */
export function setOnSignedOut(handler: (() => void) | null) {
  onSignedOut = handler;
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Leave the token off (sign-in). */
  anonymous?: boolean;
};

/**
 * Calls the portal API. Portal routes answer `{ status, data }` or
 * `{ status: 'fail', error }`; this returns `data` or throws an ApiError.
 */
export async function api<T>(path: string, { method = 'GET', body, anonymous }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token && !anonymous) headers.authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${PORTAL_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
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
