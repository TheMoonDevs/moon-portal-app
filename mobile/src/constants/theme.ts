import { Platform } from 'react-native';

/**
 * The portal's colours, in light and dark. Dark matches the website's
 * `#0a0a0b` background and `#f2f0e8` ink (portal/app/manifest.ts, the logo).
 */
export const Colors = {
  light: {
    text: '#0a0a0b',
    textSecondary: '#5f5e5a',
    background: '#f7f6f2',
    backgroundElement: '#ffffff',
    backgroundSelected: '#ecebe5',
    border: '#e4e2db',
    accent: '#0a0a0b',
    onAccent: '#f2f0e8',
    danger: '#c2410c',
    success: '#15803d',
  },
  dark: {
    text: '#f2f0e8',
    textSecondary: '#a3a19a',
    background: '#0a0a0b',
    backgroundElement: '#161618',
    backgroundSelected: '#232326',
    border: '#2a2a2d',
    accent: '#f2f0e8',
    onAccent: '#0a0a0b',
    danger: '#fb923c',
    success: '#4ade80',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', mono: 'ui-monospace' },
  default: { sans: 'normal', mono: 'monospace' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = { small: 8, medium: 12, large: 16 } as const;

export const MaxContentWidth = 640;
