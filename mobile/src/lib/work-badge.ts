import { useQuery } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from './auth';
import { PORTAL_URL } from './config';
import { useNotifications } from './notifications';
import { queryClient } from './query';
import type { PortalNotification } from './types';

/*
 * The Work tab's number: work reminders still in the phone's notification
 * list (the morning plan, "log your day", "plan tomorrow") plus unread portal
 * notifications about tasks, projects, goals and plans. Opening the Work tab
 * clears the reminders from the list.
 */

/** A portal link about work: the worklog, a task, a project, goals, plans. */
export function isWorkLink(link: string | null | undefined) {
  if (!link) return false;
  let url: URL;
  try {
    url = new URL(link, PORTAL_URL);
  } catch {
    return false;
  }
  if (url.host !== new URL(PORTAL_URL).host) return false;
  const [first, second] = url.pathname.split('/').filter(Boolean);
  if (first === 'user') return second === 'worklogs';
  return ['rest-day', 'task', 'projects', 'goals', 'plans', 'worklogs'].includes(first ?? '');
}

/** The link a portal notification opens. */
export const linkOf = (n: PortalNotification) => n.notificationData?.actions?.[0]?.trigger ?? null;

/** Unread portal notifications about work, newest first. */
export function useWorkNotifications() {
  const notifications = useNotifications();
  return (notifications.data?.notifications ?? []).filter((n) => !n.isRead && isWorkLink(linkOf(n)));
}

const REMINDERS = ['workReminders'] as const;

async function presentedWorkReminders() {
  const shown = await Notifications.getPresentedNotificationsAsync().catch(() => []);
  return shown
    .filter((n) => isWorkLink((n.request.content.data as { url?: string } | null)?.url))
    .map((n) => n.request.identifier);
}

/** Work reminders in the phone's notification list, kept fresh. */
function useWorkReminders() {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: REMINDERS,
    queryFn: presentedWorkReminders,
    enabled: status === 'signedIn',
    meta: { noPersist: true },
  });

  useEffect(() => {
    const refresh = () => void queryClient.invalidateQueries({ queryKey: REMINDERS });
    const app = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    const push = Notifications.addNotificationReceivedListener(refresh);
    return () => {
      app.remove();
      push.remove();
    };
  }, []);

  return query.data ?? [];
}

/** The number on the Work tab. */
export function useWorkBadge() {
  return useWorkReminders().length + useWorkNotifications().length;
}

/** Takes the work reminders off the phone's list (the Work tab is open). */
export async function clearWorkReminders() {
  const ids = await presentedWorkReminders();
  if (!ids.length) return;
  await Promise.all(ids.map((id) => Notifications.dismissNotificationAsync(id).catch(() => null)));
  queryClient.setQueryData(REMINDERS, []);
}
