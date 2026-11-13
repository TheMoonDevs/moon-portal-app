import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import { useSyncExternalStore } from 'react';
import { Linking, Platform } from 'react-native';

import { api } from './api';
import { APP_VERSION } from './config';

/*
 * App updates, shown at the top of Notifications like any other notice:
 *
 *   - a fix downloaded through EAS Update, ready after a restart
 *   - a newer store version (the portal's latestVersion, /api/mobile/config)
 *
 * A notice is unread until it is tapped or "Read all" is used; which ones were
 * read is kept on the phone. Each goes away once the update is in.
 */

export type MobileConfig = {
  minVersion: string;
  /** The newest store version, per platform (MOBILE_LATEST_VERSION…). */
  latestVersion?: { ios: string | null; android: string | null };
  storeUrls: { ios: string | null; android: string | null };
};

/** What the portal says about app versions, checked hourly. */
export function useMobileConfig() {
  return useQuery({
    queryKey: ['mobileConfig'],
    queryFn: () => api<MobileConfig>('/api/mobile/config', { anonymous: true }),
    staleTime: 60 * 60 * 1000,
  });
}

/** -1, 0 or 1, comparing "1.2.3" style versions. */
export function compareVersions(a: string, b: string) {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** The store version installed on this phone. */
export const nativeVersion = () => Application.nativeApplicationVersion ?? APP_VERSION;

/** This phone's store link from the portal's config. */
export const storeUrlOf = (config?: MobileConfig) =>
  (Platform.OS === 'ios' ? config?.storeUrls.ios : config?.storeUrls.android) ?? null;

const storeName = Platform.OS === 'ios' ? 'the App Store' : 'Google Play';

/* Which notices were read, kept on the phone. */
const KEY = 'portal.readAppUpdates';
let read: string[] = [];
let loaded = false;
const listeners = new Set<() => void>();

const load = () => {
  if (loaded) return;
  loaded = true;
  AsyncStorage.getItem(KEY)
    .then((raw) => {
      const saved = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(saved)) {
        read = Array.from(new Set([...read, ...saved.filter((id) => typeof id === 'string')]));
        listeners.forEach((l) => l());
      }
    })
    .catch(() => null);
};

const subscribe = (listener: () => void) => {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Marks app update notices read (kept on the phone). */
export function markAppUpdatesRead(ids: string[]) {
  const fresh = ids.filter((id) => !read.includes(id));
  if (!fresh.length) return;
  // Only the newest few matter; old ids can't come back.
  read = [...read, ...fresh].slice(-20);
  listeners.forEach((l) => l());
  void AsyncStorage.setItem(KEY, JSON.stringify(read)).catch(() => null);
}

export type AppUpdateNotice = {
  id: string;
  title: string;
  description: string;
  action: string;
  isRead: boolean;
  run: () => void;
};

/** The app update notices to show now, newest kind first. */
export function useAppUpdateNotices(): AppUpdateNotice[] {
  const readIds = useSyncExternalStore(subscribe, () => read);
  const { isUpdatePending, downloadedUpdate } = Updates.useUpdates();
  const config = useMobileConfig().data;
  const notices: Omit<AppUpdateNotice, 'isRead'>[] = [];

  if (isUpdatePending)
    notices.push({
      id: `fix-${downloadedUpdate?.updateId ?? 'ready'}`,
      title: 'App update ready',
      description: 'Restart Portal to get the latest fixes. It takes a second.',
      action: 'Restart now',
      run: () => void Updates.reloadAsync().catch(() => null),
    });

  const latest = Platform.OS === 'ios' ? config?.latestVersion?.ios : config?.latestVersion?.android;
  const store = storeUrlOf(config);
  if (latest && store && compareVersions(nativeVersion(), latest) < 0)
    notices.push({
      id: `store-${latest}`,
      title: `Portal ${latest} is out`,
      description: `You have ${nativeVersion()}. Update from ${storeName} for the newest features.`,
      action: 'Update',
      run: () => void Linking.openURL(store).catch(() => null),
    });

  return notices.map((n) => ({ ...n, isRead: readIds.includes(n.id) }));
}
