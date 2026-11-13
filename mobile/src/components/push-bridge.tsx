import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { messagesKey, newClientId, useChatUnread } from '@/lib/chat';
import { openLink } from '@/lib/links';
import { unreadCount, useNotifications } from '@/lib/notifications';
import { usePreferences } from '@/lib/preferences';
import { type PushData, registerForPush, setBadge } from '@/lib/push';
import { queryClient, refreshWork } from '@/lib/query';
import { useTaskReminders } from '@/lib/reminders';

/**
 * Push while signed in: gives the portal this phone's push token, opens the
 * right screen when a notification is tapped (also when it started the app),
 * acts on its buttons (Reply, Mark as read, Done), keeps the task reminders
 * set and the app icon's number in step with what is unread.
 */
export function PushBridge() {
  const { status } = useAuth();
  const { push } = usePreferences();
  const signedIn = status === 'signedIn';
  const handled = useRef(new Set<string>());
  const last = Notifications.useLastNotificationResponse();
  const notifications = useNotifications();
  const chats = useChatUnread();
  useTaskReminders();

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
      void markRead(chatId);
      return;
    }
    if (last.actionIdentifier === 'chat-reply' && chatId) {
      void reply(chatId, last.userText ?? '');
      return;
    }
    if (last.actionIdentifier === 'task-done' && data.taskId) {
      void api(`/api/me/day/tasks/${data.taskId}`, { method: 'PATCH', body: { status: 'done' } })
        .then(() => refreshWork())
        .catch(() =>
          tellPhone('Couldn’t mark it done', last.notification.request.content.body ?? 'Open the task to try again.', {
            url: `/task/${data.taskId}`,
          }),
        );
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

/** A chat read from its notification's button. */
async function markRead(chatId: string) {
  await api(`/api/chat/conversations/${chatId}/read`, { method: 'POST' })
    .then(() => queryClient.invalidateQueries({ queryKey: ['chatSummary'] }))
    .catch(() => null);
}

/** A reply typed under a chat notification: sent, and the chat read. */
async function reply(chatId: string, typed: string) {
  const text = typed.trim();
  if (!text) return;
  try {
    await api(`/api/chat/conversations/${chatId}/messages`, {
      method: 'POST',
      body: { clientId: newClientId(), text, replyToId: null },
    });
    void queryClient.invalidateQueries({ queryKey: messagesKey(chatId) });
    void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    await markRead(chatId);
  } catch {
    tellPhone('Your reply wasn’t sent', text, { url: `/messages/${chatId}` });
  }
}

/** A notification from the phone itself, at once. */
function tellPhone(title: string, body: string, data: PushData) {
  void Notifications.scheduleNotificationAsync({ content: { title, body, data }, trigger: null }).catch(
    () => null,
  );
}
