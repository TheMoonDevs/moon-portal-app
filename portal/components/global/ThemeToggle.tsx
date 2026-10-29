'use client';

import { useEffect, useState } from 'react';

import { THEME_KEY } from '@/lib/theme';
import { cn } from '@/lib/utils';

import { Icon } from '../screens/Admin/shared/AdminUI';

type Theme = 'light' | 'dark';

const current = (): Theme => {
  const set = document.documentElement.dataset.theme;
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
};

/** Switches the portal between light and dark (see lib/theme). */
export const ThemeToggle = ({ className }: { className?: string }) => {
  const [theme, setTheme] = useState<Theme | null>(null);
  useEffect(() => setTheme(current()), []);
  const next: Theme = theme === 'light' ? 'dark' : 'light';
  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch {
          // Storage can be blocked; the choice then lasts for this visit.
        }
        setTheme(next);
      }}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={cn(
        'flex size-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white auto-light:text-neutral-500 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-950',
        className,
      )}
    >
      <Icon
        name={theme === 'light' ? 'dark_mode' : 'light_mode'}
        className={cn('text-[18px]', !theme && 'opacity-0')}
      />
    </button>
  );
};
