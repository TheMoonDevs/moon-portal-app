import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

/*
 * Settings the person picks on this phone: the theme, the Face ID lock and
 * whether to get push notifications. Kept in AsyncStorage (they are not
 * secrets) and read once at launch.
 */

export type ThemeChoice = 'system' | 'light' | 'dark';

export type Preferences = {
  theme: ThemeChoice;
  /** Ask for Face ID or a fingerprint when the app opens. */
  lock: boolean;
  /** Push notifications on this phone. */
  push: boolean;
};

const KEY = 'portal.preferences';
const DEFAULTS: Preferences = { theme: 'system', lock: false, push: true };

let current: Preferences = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

const applyTheme = (theme: ThemeChoice) => {
  try {
    Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);
  } catch {
    // Older systems follow the phone's setting.
  }
};

/** Reads the saved settings; call once before the first screen. */
export async function loadPreferences() {
  if (loaded) return current;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) current = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Preferences>) };
  } catch {
    current = DEFAULTS;
  }
  loaded = true;
  applyTheme(current.theme);
  listeners.forEach((l) => l());
  return current;
}

export function getPreferences() {
  return current;
}

export async function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
  current = { ...current, [key]: value };
  if (key === 'theme') applyTheme(value as ThemeChoice);
  listeners.forEach((l) => l());
  await AsyncStorage.setItem(KEY, JSON.stringify(current)).catch(() => null);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function usePreferences() {
  return useSyncExternalStore(subscribe, getPreferences, getPreferences);
}
