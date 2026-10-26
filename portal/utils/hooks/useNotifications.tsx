'use client';
import { useEffect } from 'react';
import useSWR from 'swr';

import type { INotification } from '@/components/screens/notifications/NotificationsList';
import { useAppSelector } from '@/utils/redux/store';

import { PortalSdk } from '../services/PortalSdk';

const NOTIFICATIONS_URL = '/api/notifications/get';
// Notifications used to be cached in the browser under this key.
const LEGACY_STORAGE_KEY = 'notifications';

const fetchNotifications = async (url: string): Promise<INotification[]> => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load notifications');
  const body = await response.json();
  return body?.data?.notifications ?? [];
};

/**
 * The signed-in user's notifications, always read from the server. Changes are
 * shown straight away and rolled back if the server refuses them.
 */
export const useNotifications = () => {
  const user = useAppSelector((state) => state.auth.user);
  const { data, error, isLoading, mutate } = useSWR<INotification[]>(
    user ? [NOTIFICATIONS_URL, user.id] : null,
    ([url]: [string]) => fetchNotifications(url),
    { refreshInterval: 3 * 60 * 1000, revalidateOnFocus: true },
  );
  const notifications = data ?? [];
  const unreadNotifications = notifications.filter((n) => !n?.isRead);

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Storage can be blocked; nothing to clean up then.
    }
  }, []);

  /** Apply `change` locally, send `request`, then resync with the server. */
  const optimistic = async (
    change: (list: INotification[]) => INotification[],
    request: () => Promise<unknown>,
  ) => {
    try {
      await mutate(
        async () => {
          await request();
          return fetchNotifications(NOTIFICATIONS_URL);
        },
        {
          optimisticData: (current?: INotification[]) => change(current ?? []),
          rollbackOnError: true,
          revalidate: false,
        },
      );
    } catch (e) {
      console.error('Notification update failed', e);
    }
  };

  const setRead = (ids: string[], isRead: boolean) =>
    optimistic(
      (list) => list.map((n) => (ids.includes(n.id) ? { ...n, isRead } : n)),
      () => PortalSdk.putData('/api/notifications/update', { ids, isRead }),
    );

  const toggleNotificationRead = (notification: INotification) =>
    setRead([notification.id], !notification.isRead);

  const markAsRead = (notification: INotification) =>
    notification.isRead ? Promise.resolve() : setRead([notification.id], true);

  const handleMarkAllAsRead = () => {
    if (unreadNotifications.length === 0) return Promise.resolve();
    return optimistic(
      (list) => list.map((n) => ({ ...n, isRead: true })),
      () =>
        PortalSdk.putData('/api/notifications/update', {
          all: true,
          isRead: true,
        }),
    );
  };

  const removeNotification = (notification: INotification) =>
    optimistic(
      (list) => list.filter((n) => n.id !== notification.id),
      () =>
        PortalSdk.deleteData('/api/notifications/delete', {
          ids: [notification.id],
        }),
    );

  const clearAllNotifications = () => {
    if (notifications.length === 0) return Promise.resolve();
    return optimistic(
      () => [],
      () => PortalSdk.deleteData('/api/notifications/delete', { all: true }),
    );
  };

  return {
    notifications,
    notificationsCount: notifications.length,
    unreadNotifications,
    unreadNotificationsCount: unreadNotifications.length,
    isLoading,
    isError: error,
    toggleNotificationRead,
    markAsRead,
    handleMarkAllAsRead,
    removeNotification,
    clearAllNotifications,
  };
};
