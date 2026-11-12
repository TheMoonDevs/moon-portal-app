import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

/*
 * How often the person opens each shortcut, on this phone, so the four they
 * use most sit at the top of Shortcuts. Counts fade a little each time, so
 * what they use lately wins over what they used a lot long ago.
 */

const KEY = 'portal.shortcutUsage';
const FADE = 0.97;

type Usage = Record<string, number>;

let usage: Usage = {};
let loaded = false;
const listeners = new Set<(u: Usage) => void>();

async function load() {
  if (loaded) return usage;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) usage = JSON.parse(raw) as Usage;
  } catch {
    usage = {};
  }
  loaded = true;
  return usage;
}

/** Counts one opening of a shortcut. */
export async function countShortcut(key: string) {
  await load();
  const next: Usage = {};
  for (const [k, n] of Object.entries(usage)) if (n * FADE > 0.05) next[k] = n * FADE;
  next[key] = (next[key] ?? 0) + 1;
  usage = next;
  listeners.forEach((l) => l(usage));
  await AsyncStorage.setItem(KEY, JSON.stringify(usage)).catch(() => null);
}

/** The person's most used shortcuts, then the defaults, `size` in all. */
export function useTopShortcuts(defaults: string[], all: string[], size = 4) {
  const [now, setNow] = useState<Usage>(usage);
  useEffect(() => {
    let alive = true;
    void load().then((u) => alive && setNow({ ...u }));
    const listen = (u: Usage) => setNow({ ...u });
    listeners.add(listen);
    return () => {
      alive = false;
      listeners.delete(listen);
    };
  }, []);
  const used = all
    .filter((k) => (now[k] ?? 0) >= 1)
    .sort((a, b) => (now[b] ?? 0) - (now[a] ?? 0))
    .slice(0, size);
  return [...used, ...defaults.filter((k) => !used.includes(k))].slice(0, size);
}
