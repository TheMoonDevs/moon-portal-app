import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { WHATS_NEW, type WhatsNew } from '@/constants/whats-new';

/*
 * The newest "What's new" shows on Home until it is closed; which one was
 * closed is kept on the phone.
 */

const KEY = 'portal.whatsNewSeen';

/** Undefined until read from the phone, so nothing flashes on launch. */
let seen: string | null | undefined;
const listeners = new Set<() => void>();

const load = () => {
  if (seen !== undefined) return;
  AsyncStorage.getItem(KEY)
    .then((value) => {
      seen = value;
    })
    .catch(() => {
      seen = null;
    })
    .finally(() => listeners.forEach((l) => l()));
};

const subscribe = (listener: () => void) => {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const read = () => seen;

/** The newest entry while it hasn't been closed, else null. */
export function useWhatsNew(): WhatsNew | null {
  const closed = useSyncExternalStore(subscribe, read, read);
  const newest = WHATS_NEW[0];
  if (closed === undefined || !newest || closed === newest.id) return null;
  return newest;
}

export function closeWhatsNew() {
  const newest = WHATS_NEW[0];
  if (!newest) return;
  seen = newest.id;
  listeners.forEach((l) => l());
  void AsyncStorage.setItem(KEY, newest.id).catch(() => null);
}
