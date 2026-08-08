'use client';

import { useEffect, useRef } from 'react';

import { useToast } from '@/components/elements/Toast';
import {
  PERMISSION_DENIED_EVENT,
  type PermissionErrorDetail,
} from '@/utils/permissions/clientPermissions';

/**
 * App-wide listener for permission-denied events. Any API call that fails with
 * a 403 permission error broadcasts `tmd:permission-denied` (see
 * `clientPermissions`), and this shows a toast wherever the user is — so a
 * blocked action (e.g. saving a worklog without `worklogs:edit`) always gives
 * feedback, without every screen needing its own error boundary.
 *
 * Mounted once at the app root. The full-screen `PermissionErrorBoundary`
 * still handles the rarer case of a permission error thrown during render.
 */
export const PermissionDeniedToaster = () => {
  const { showToast } = useToast();
  // Suppress duplicate toasts from a burst of denials (e.g. a bulk action
  // firing many 403s at once).
  const lastRef = useRef<{ message: string; at: number }>({
    message: '',
    at: 0,
  });

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<PermissionErrorDetail>).detail ?? {};
      const message =
        detail.message ||
        (detail.requiredPermission
          ? `You don't have permission for "${detail.requiredPermission}".`
          : 'You do not have permission to perform this action.');

      const now = Date.now();
      if (
        lastRef.current.message === message &&
        now - lastRef.current.at < 3000
      )
        return;
      lastRef.current = { message, at: now };

      showToast({
        id: `perm-denied-${now}`,
        icon: 'lock',
        color: 'red',
        message,
        isHidable: true,
      });
    };

    window.addEventListener(PERMISSION_DENIED_EVENT, handler);
    return () => window.removeEventListener(PERMISSION_DENIED_EVENT, handler);
  }, [showToast]);

  return null;
};

export default PermissionDeniedToaster;
