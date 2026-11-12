import { useQuery } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';

import { api } from './api';
import { useAuth } from './auth';
import { PORTAL_URL } from './config';
import { useNotifications } from './notifications';
import { needsYou } from './status';
import type { MyTasks, PortalNotification } from './types';

/*
 * The Work tab's number: the person's open tasks that need them now, waiting
 * on them or blocked (they show first on the Work tab). Opening the tab also
 * clears work reminders (the morning plan, "log your day") from the phone's
 * notification list.
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

async function presentedWorkReminders() {
  const shown = await Notifications.getPresentedNotificationsAsync().catch(() => []);
  return shown
    .filter((n) => isWorkLink((n.request.content.data as { url?: string } | null)?.url))
    .map((n) => n.request.identifier);
}

/** The person's open tasks, everywhere. */
export function useMyTasks() {
  const { status } = useAuth();
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => api<MyTasks>('/api/me/tasks'),
    enabled: status === 'signedIn',
  });
}

/** Open tasks waiting on the person or blocked, the longest waiting first. */
export function useNeedsYou() {
  const tasks = useMyTasks().data?.tasks ?? [];
  return tasks
    .filter(needsYou)
    .sort((a, b) => (a.updatedAt ?? '').localeCompare(b.updatedAt ?? ''));
}

/** The number on the Work tab. */
export function useWorkBadge() {
  return useNeedsYou().length;
}

/** Takes the work reminders off the phone's list (the Work tab is open). */
export async function clearWorkReminders() {
  const ids = await presentedWorkReminders();
  if (!ids.length) return;
  await Promise.all(ids.map((id) => Notifications.dismissNotificationAsync(id).catch(() => null)));
}
