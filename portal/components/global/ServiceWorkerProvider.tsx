'use client';

import { useEffect } from 'react';

import { useUser } from '@/utils/hooks/useUser';
import { syncPushSubscription } from '@/utils/services/notifications/pushService';

/**
 * Registers the service worker (app/sw.ts) and keeps this browser's push
 * subscription saved for the signed-in user.
 *
 * New versions install and take over on their own, so there is no update
 * prompt: the next page load simply runs the latest deploy.
 */
export const ServiceWorkerProvider = () => {
  const { user } = useUser();
  const userId = user?.id;

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch((error) => console.error('Service worker failed:', error));
  }, []);

  useEffect(() => {
    if (!userId) return;
    syncPushSubscription().catch((error) =>
      console.error('Could not sync push subscription:', error),
    );
  }, [userId]);

  return null;
};
