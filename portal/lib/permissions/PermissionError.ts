/**
 * Machine-readable code carried by permission-denied API responses and by the
 * client-side error so the UI can distinguish a 403-permission failure from
 * any other error.
 */
export const PERMISSION_DENIED_CODE = 'PERMISSION_DENIED';

export interface PermissionErrorDetail {
  /** The permission the caller was missing, e.g. `worksheets:edit`. */
  requiredPermission?: string;
  /** Human-readable message. */
  message?: string;
}

/**
 * Error thrown/rejected on the client when an API call fails specifically
 * because the current user lacks a required permission. Shared (framework
 * agnostic) so both server and client code can reference it.
 */
export class PermissionError extends Error {
  readonly code = PERMISSION_DENIED_CODE;
  readonly requiredPermission?: string;

  constructor(detail: PermissionErrorDetail = {}) {
    super(
      detail.message ??
        (detail.requiredPermission
          ? `Missing permission: ${detail.requiredPermission}`
          : 'You do not have permission to perform this action'),
    );
    this.name = 'PermissionError';
    this.requiredPermission = detail.requiredPermission;
    // Restore prototype chain for instanceof across transpilation targets.
    Object.setPrototypeOf(this, PermissionError.prototype);
  }
}

export function isPermissionDeniedPayload(
  payload: unknown,
): payload is { code: string; error?: string; requiredPermission?: string } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    (payload as { code?: unknown }).code === PERMISSION_DENIED_CODE
  );
}
