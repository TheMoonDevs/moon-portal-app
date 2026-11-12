import { useSyncExternalStore } from 'react';

/*
 * The time, for clocks on screen: one timer for the whole app, ticking on
 * the minute while anything shows it.
 */

let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

function tick() {
  now = Date.now();
  listeners.forEach((l) => l());
  timer = setTimeout(tick, 60_000 - (now % 60_000) + 50);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setTimeout(tick, 60_000 - (now % 60_000) + 50);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
}

const snapshot = () => now;

/** The time now, as a Date, changing each minute. */
export function useNow() {
  return new Date(useSyncExternalStore(subscribe, snapshot, snapshot));
}
