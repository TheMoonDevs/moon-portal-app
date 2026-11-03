'use client';

import { useEffect, useState } from 'react';

/**
 * Light or dark as the portal shows it right now: the theme picked in the
 * portal (data-theme on <html>), else the device's. For things that can't
 * use the `auto-light:` variant, like toasts.
 */
export const useResolvedTheme = (): 'light' | 'dark' => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const update = () => {
      const set = document.documentElement.dataset.theme;
      setTheme(
        set === 'light' || set === 'dark'
          ? set
          : media.matches
            ? 'light'
            : 'dark',
      );
    };
    update();
    media.addEventListener('change', update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => {
      media.removeEventListener('change', update);
      observer.disconnect();
    };
  }, []);
  return theme;
};
