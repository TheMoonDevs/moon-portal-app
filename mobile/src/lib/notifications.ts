import { useMutation, useQuery } from '@tanstack/react-query';

import { api } from './api';
import { useAppUpdateNotices } from './app-updates';
import { useAuth } from './auth';
import { queryClient } from './query';
import type { PortalNotification } from './types';

type List = { notifications: PortalNotification[] };

/** The person's notifications, newest first (the website's bell). */
export function useNotifications() {
  const { status } = useAuth();
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<List>('/api/notifications/get'),
    enabled: status === 'signedIn',
    refetchInterval: 60_000,
  });
}

export const unreadCount = (data?: List) =>
  (data?.notifications ?? []).filter((n) => !n.isRead).length;

/** Unread notifications for the bell: the portal's, plus app update notices. */
export function useUnreadCount() {
  const portal = unreadCount(useNotifications().data);
  return portal + useAppUpdateNotices().filter((n) => !n.isRead).length;
}

/** Marks some notifications (or all) read or unread. */
export function useMarkNotifications() {
  return useMutation({
    mutationFn: (input: { ids?: string[]; all?: boolean; isRead: boolean }) =>
      api('/api/notifications/update', { method: 'PUT', body: input }),
    onMutate: (input) => {
      queryClient.setQueryData<List>(['notifications'], (d) =>
        d
          ? {
              notifications: d.notifications.map((n) =>
                input.all || input.ids?.includes(n.id) ? { ...n, isRead: input.isRead } : n,
              ),
            }
          : d,
      );
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
