'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { isAllowed } from '@/lib/permissions';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';

const Interstitial = ({ message }: { message: string }) => (
  <div className="flex h-screen flex-col items-center justify-center bg-neutral-700 py-2 md:bg-neutral-900">
    <div className="flex flex-row items-center justify-center gap-2">
      <div className="size-5 animate-spin rounded-full border-y-2 border-neutral-100"></div>
      <p className="text-neutral-100">{message}</p>
    </div>
  </div>
);

export const PageAccess = ({
  isAuthRequired,
  isAdminRequired,
  requiredPermission,
  hasBottombar = true,
  children,
}: {
  children: React.ReactNode;
  isAuthRequired?: boolean;
  isAdminRequired?: boolean;
  /**
   * Gate the page on a specific policy (e.g. `users:edit`) instead of, or in
   * addition to, full-admin status. A non-admin holding this policy — or an
   * admin who has not had it denied — may open the page. Enforcement of the
   * underlying data still happens on the API; this only controls page entry.
   */
  requiredPermission?: string;
  hasBottombar?: boolean;
}) => {
  const { user, status, verifiedUserEmail } = useUser();
  const router = useRouter();

  const isGuarded = Boolean(
    isAuthRequired || isAdminRequired || requiredPermission,
  );
  const isGoogleVerified = !!user?.email && verifiedUserEmail === user.email;
  const isAdminSatisfied = !isAdminRequired || Boolean(user?.isAdmin);
  const isPermissionSatisfied =
    !requiredPermission || isAllowed(user ?? undefined, requiredPermission);
  const isAccessSatisfied = isAdminSatisfied && isPermissionSatisfied;

  useEffect(() => {
    if (!isGuarded || status === 'loading') return;

    if (status === 'unauthenticated' || !isGoogleVerified) {
      router.replace(APP_ROUTES.login);
      return;
    }
    if (!isAccessSatisfied) router.replace(APP_ROUTES.home);
  }, [isGuarded, status, isGoogleVerified, isAccessSatisfied, router]);

  const content = hasBottombar ? (
    <div className="md:pl-24">{children}</div>
  ) : (
    <>{children}</>
  );

  if (!isGuarded) return content;
  if (status === 'loading')
    return <Interstitial message="Verifying Connection..." />;
  if (status === 'unauthenticated' || !isGoogleVerified || !isAccessSatisfied) {
    return <Interstitial message="Redirecting..." />;
  }

  return content;
};
