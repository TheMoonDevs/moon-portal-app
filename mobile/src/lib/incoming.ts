import { useSyncExternalStore } from 'react';

/*
 * Portal links opened from outside the app: a portal.themoondevs.com link
 * tapped in mail or WhatsApp opens the app (universal links on iPhone, app
 * links on Android) and comes in through app/+native-intent.tsx. It waits
 * here until someone is signed in, then components/entry-bridge.tsx opens its
 * screen (or the website page, for one the app has no screen for).
 */

let held: string | null = null;
const listeners = new Set<() => void>();

/** Keeps a website path ("/projects/abc") to open once the app is ready. */
export function holdLink(path: string) {
  held = path;
  listeners.forEach((l) => l());
}

/** The held link, once: it is forgotten as it is taken. */
export function takeLink() {
  const path = held;
  held = null;
  if (path) listeners.forEach((l) => l());
  return path;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const read = () => held;

export function useHeldLink() {
  return useSyncExternalStore(subscribe, read, read);
}
