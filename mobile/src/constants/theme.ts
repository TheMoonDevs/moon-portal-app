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
    /* Chat, in WhatsApp's colours. */
    chatBackground: '#efeae2',
    bubbleMine: '#d9fdd3',
    bubbleTheirs: '#ffffff',
    chatGreen: '#1daa61',
    chatBadge: '#25d366',
    tickRead: '#53bdeb',
    chatPill: '#ffffff',
    chipOn: '#d8fdd2',
    chipOnText: '#15603e',
    /* The grouped lists of iOS Settings. */
    grouped: '#f2f2f7',
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
    chatBackground: '#0b141a',
    bubbleMine: '#144d37',
    bubbleTheirs: '#1f2c34',
    chatGreen: '#21c063',
    chatBadge: '#21c063',
    tickRead: '#53bdeb',
    chatPill: '#182229',
    chipOn: '#103529',
    chipOnText: '#d8fdd2',
    grouped: '#0a0a0b',
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
/** Two columns on an iPad (components/ui.tsx `Columns`). */
export const WideContentWidth = 1100;
