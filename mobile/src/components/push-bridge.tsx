import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useChatUnread } from '@/lib/chat';
import { openLink } from '@/lib/links';
import { unreadCount, useNotifications } from '@/lib/notifications';
import { usePreferences } from '@/lib/preferences';
import { type PushData, registerForPush, setBadge } from '@/lib/push';
import { queryClient } from '@/lib/query';

/**
 * Push while signed in: gives the portal this phone's push token, opens the
 * right screen when a notification is tapped (also when it started the app),
 * and keeps the app icon's number in step with what is unread.
 */
export function PushBridge() {
  const { status } = useAuth();
  const { push } = usePreferences();
  const signedIn = status === 'signedIn';
  const handled = useRef(new Set<string>());
  const last = Notifications.useLastNotificationResponse();
  const notifications = useNotifications();
  const chats = useChatUnread();

  useEffect(() => {
    if (signedIn && push) void registerForPush(true);
  }, [signedIn, push]);

  useEffect(() => {
    if (!signedIn || !last) return;
    const id = `${last.notification.request.identifier}:${last.actionIdentifier}`;
    if (handled.current.has(id)) return;
    handled.current.add(id);
    const data = (last.notification.request.content.data ?? {}) as PushData;
    const chatId = data.chat?.conversationId;
    if (last.actionIdentifier === 'chat-read' && chatId) {
      void api(`/api/chat/conversations/${chatId}/read`, { method: 'POST' })
        .then(() => queryClient.invalidateQueries({ queryKey: ['chatSummary'] }))
        .catch(() => null);
      return;
    }
    // Let the screens mount before moving.
    setTimeout(() => void openLink(data.url ?? (chatId ? `/messages/${chatId}` : null)), 0);
  }, [signedIn, last]);

  // A push arriving while the app is open: refresh what it is about.
  useEffect(() => {
    if (!signedIn) return;
    const sub = Notifications.addNotificationReceivedListener((n) => {
      const data = (n.request.content.data ?? {}) as PushData;
      if (data.chat) void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
    return () => sub.remove();
  }, [signedIn]);

  const badge = signedIn ? unreadCount(notifications.data) + (chats.data?.unread ?? 0) : 0;
  useEffect(() => {
    setBadge(badge);
  }, [badge]);

  return null;
}
