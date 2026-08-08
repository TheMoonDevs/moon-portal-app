import {
  isPermissionDeniedPayload,
  PermissionError,
  type PermissionErrorDetail,
} from '@/lib/permissions/PermissionError';

export { PermissionError };
export type { PermissionErrorDetail };

/**
 * Global browser event fired whenever an API call fails because the current
 * user lacks a required permission. The `PermissionErrorBoundary` listens for
 * this so a fallback can be shown even when the failing fetch lives deep inside
 * a component that swallows the error into local state.
 */
export const PERMISSION_DENIED_EVENT = 'tmd:permission-denied';

export type PermissionDeniedEvent = CustomEvent<PermissionErrorDetail>;

/** Broadcast a permission-denied event so any mounted boundary can react. */
export function dispatchPermissionDenied(detail: PermissionErrorDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PERMISSION_DENIED_EVENT, { detail }));
}

/**
 * Given a parsed API error payload, returns a `PermissionError` when the
 * payload represents a 403 permission denial (and dispatches the global event
 * as a side effect), or `null` otherwise.
 */
export function toPermissionError(payload: unknown): PermissionError | null {
  if (!isPermissionDeniedPayload(payload)) return null;
  const detail: PermissionErrorDetail = {
    requiredPermission: payload.requiredPermission,
    message: payload.error,
  };
  dispatchPermissionDenied(detail);
  return new PermissionError(detail);
}

/**
 * Inspect a `fetch` Response; if it is a 403 permission denial, dispatch the
 * global event and return a `PermissionError` to throw. Returns null otherwise.
 * Clones the response so the caller can still read the body.
 */
export async function permissionErrorFromResponse(
  res: Response,
): Promise<PermissionError | null> {
  if (res.status !== 403) return null;
  try {
    const payload = await res.clone().json();
    return toPermissionError(payload);
  } catch {
    return null;
  }
}
