import { useQuery } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';

import { api } from './api';
import { fromKey } from './dates';
import { usePreferences } from './preferences';
import { type PushData, preparePush } from './push';
import { isOpen } from './tasks';
import type { MyTasks, Task } from './types';

/*
 * Task reminders made on the phone (no portal involved): at 9 am on the day
 * an open task of theirs is due, with a Done button, and 10 minutes before
 * each meeting. They follow the person's task list: every time it changes,
 * reminders that no longer fit are taken off and new ones are set.
 */

const PREFIX = 'reminder-';
/** iPhones keep at most 64 waiting notifications per app. */
const MAX = 40;
const DUE_HOUR = 9;
const MEETING_LEAD_MINUTES = 10;

type Reminder = {
  id: string;
  at: Date;
  title: string;
  body: string;
  data: PushData;
  /** Shows the Done button. */
  task: boolean;
};

/** A short fingerprint, so a renamed task gets a fresh reminder. */
const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

export function remindersFor(tasks: Task[], now = new Date()): Reminder[] {
  const list: Reminder[] = [];
  for (const t of tasks) {
    const m = t.meeting;
    if (m) {
      if (m.status === 'DECLINED' || m.status === 'CANCELLED') continue;
      const start = new Date(m.start);
      const at = new Date(start.getTime() - MEETING_LEAD_MINUTES * 60_000);
      if (Number.isNaN(at.getTime()) || at <= now) continue;
      list.push({
        id: `${PREFIX}meet-${t.id}-${start.getTime().toString(36)}`,
        at,
        title: `Meeting in ${MEETING_LEAD_MINUTES} minutes`,
        body: [m.with ? `With ${m.with}` : t.title, m.time].filter(Boolean).join(' · '),
        data: { url: '/meet' },
        task: false,
      });
      continue;
    }
    if (!isOpen(t) || !t.dueDate) continue;
    const day = t.dueDate.slice(0, 10);
    const at = fromKey(day);
    if (Number.isNaN(at.getTime())) continue;
    at.setHours(DUE_HOUR, 0, 0, 0);
    if (at <= now) continue;
    list.push({
      id: `${PREFIX}due-${t.id}-${day}-${hash(t.title)}`,
      at,
      title: 'Due today',
      body: t.title,
      data: { url: `/task/${t.id}`, taskId: t.id },
      task: true,
    });
  }
  return list.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX);
}

const ours = async () =>
  (await Notifications.getAllScheduledNotificationsAsync()).filter((n) =>
    n.identifier.startsWith(PREFIX),
  );

async function sync(reminders: Reminder[]) {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;
  await preparePush();
  const wanted = new Set(reminders.map((r) => r.id));
  const set = await ours();
  await Promise.all(
    set
      .filter((n) => !wanted.has(n.identifier))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  const have = new Set(set.map((n) => n.identifier));
  for (const r of reminders) {
    if (have.has(r.id)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: {
        title: r.title,
        body: r.body,
        data: r.data,
        sound: 'default',
        ...(r.task && { categoryIdentifier: 'task' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: r.at,
        channelId: 'default',
      },
    });
  }
}

/** Takes every reminder off (signed out, or reminders turned off). */
export async function clearReminders() {
  if (Platform.OS === 'web') return;
  const set = await ours().catch(() => []);
  await Promise.all(set.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))).catch(
    () => null,
  );
}

/** Keeps the phone's reminders in step with the person's tasks. */
export function useTaskReminders() {
  const { reminders: on } = usePreferences();
  const tasks = useQuery({ queryKey: ['tasks'], queryFn: () => api<MyTasks>('/api/me/tasks') });
  const list = useMemo(() => (on && tasks.data ? remindersFor(tasks.data.tasks) : null), [on, tasks.data]);
  const key = list?.map((r) => r.id).join('|');

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!on) void clearReminders();
    else if (list) void sync(list).catch(() => null);
    // `key` stands for the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, key]);
}
