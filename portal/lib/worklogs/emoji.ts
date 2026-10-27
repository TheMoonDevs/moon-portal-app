/**
 * The emoji legend used in worklogs: what each emoji means, the text code
 * that turns into it, and its keyboard shortcut. Shortcuts use Alt (Option on
 * a Mac) with a number key, matched by physical key so they work on every
 * keyboard layout. Ctrl+Space, Ctrl+Q and Ctrl+P are quick shortcuts for ✅,
 * ❌ and 🟡.
 */
export const EMOJI_LEGEND = [
  { code: ':check:', emoji: '✅', label: 'Task completed', key: '1' },
  { code: ':cross:', emoji: '❌', label: 'Task failed', key: '2' },
  { code: ':yellow:', emoji: '🟡', label: 'Task in progress', key: '3' },
  { code: ':red:', emoji: '🔴', label: 'Task blocked', key: '4' },
  { code: ':calendar:', emoji: '📅', label: 'Scheduled task', key: '5' },
  { code: ':pencil:', emoji: '✏️', label: 'Task being written', key: '6' },
  { code: ':bulb:', emoji: '💡', label: 'New idea', key: '7' },
  { code: ':question:', emoji: '❓', label: 'Need clarification', key: '8' },
  { code: ':star:', emoji: '⭐', label: 'High priority', key: '9' },
  { code: ':moved:', emoji: '➡️', label: 'Moved to a later day', key: '0' },
] as const;

/** Replaces `:check:` style codes with their emoji. */
export const replaceEmojiCodes = (content: string) =>
  EMOJI_LEGEND.reduce(
    (text, { code, emoji }) => text.replaceAll(code, emoji),
    content,
  );

/** The emoji a key press should insert, or null if it is not a shortcut. */
export function emojiForShortcut(e: {
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  key: string;
  code: string;
}): string | null {
  if (e.ctrlKey && !e.altKey && !e.metaKey) {
    if (e.key === ' ') return '✅';
    if (e.key.toLowerCase() === 'q') return '❌';
    if (e.key.toLowerCase() === 'p') return '🟡';
  }
  if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    const digit = e.code.match(/^(?:Digit|Numpad)(\d)$/)?.[1];
    return EMOJI_LEGEND.find((item) => item.key === digit)?.emoji ?? null;
  }
  return null;
}
