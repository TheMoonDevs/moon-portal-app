import { type AndroidSymbol, SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { useTheme } from '@/hooks/use-theme';

/** The app's icons: an SF Symbol on iPhone and a Material Symbol on Android. */
export const ICONS = {
  add: { ios: 'plus', android: 'add' },
  bell: { ios: 'bell', android: 'notifications' },
  check: { ios: 'checkmark', android: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  circle: { ios: 'circle', android: 'radio_button_unchecked' },
  chevron: { ios: 'chevron.right', android: 'chevron_right' },
  back: { ios: 'chevron.left', android: 'chevron_left' },
  forward: { ios: 'chevron.right', android: 'chevron_right' },
  send: { ios: 'arrow.up.circle.fill', android: 'send' },
  camera: { ios: 'camera', android: 'photo_camera' },
  calendar: { ios: 'calendar', android: 'calendar_month' },
  share: { ios: 'square.and.arrow.up', android: 'share' },
  copy: { ios: 'doc.on.doc', android: 'content_copy' },
  lock: { ios: 'lock', android: 'lock' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  trash: { ios: 'trash', android: 'delete' },
  settings: { ios: 'gearshape', android: 'settings' },
  person: { ios: 'person.crop.circle', android: 'account_circle' },
  people: { ios: 'person.2', android: 'group' },
  flag: { ios: 'flag', android: 'flag' },
  block: { ios: 'hand.raised', android: 'block' },
  trophy: { ios: 'trophy', android: 'emoji_events' },
  page: { ios: 'doc.text', android: 'description' },
  target: { ios: 'scope', android: 'target' },
  map: { ios: 'map', android: 'map' },
  clock: { ios: 'clock', android: 'schedule' },
  video: { ios: 'video', android: 'videocam' },
  globe: { ios: 'globe', android: 'language' },
  pencil: { ios: 'square.and.pencil', android: 'edit_square' },
  history: { ios: 'clock.arrow.circlepath', android: 'history' },
  folder: { ios: 'folder', android: 'folder' },
  star: { ios: 'star.fill', android: 'star' },
  bolt: { ios: 'bolt.fill', android: 'bolt' },
  search: { ios: 'magnifyingglass', android: 'search' },
  cloudOff: { ios: 'icloud.slash', android: 'cloud_off' },
  link: { ios: 'link', android: 'link' },
  apple: { ios: 'apple.logo', android: 'phone_iphone' },
  moon: { ios: 'moon', android: 'dark_mode' },
  close: { ios: 'xmark', android: 'close' },
  photo: { ios: 'photo', android: 'image' },
  doc: { ios: 'doc', android: 'draft' },
  reply: { ios: 'arrowshape.turn.up.left', android: 'reply' },
  checklist: { ios: 'checklist', android: 'checklist' },
  chat: { ios: 'bubble.left.and.bubble.right.fill', android: 'chat' },
  chevronDown: { ios: 'chevron.down', android: 'expand_more' },
  grid: { ios: 'square.grid.2x2', android: 'apps' },
  pin: { ios: 'pin.fill', android: 'push_pin' },
  muted: { ios: 'speaker.slash.fill', android: 'volume_off' },
  quote: { ios: 'quote.opening', android: 'format_quote' },
  building: { ios: 'building.2', android: 'apartment' },
  xCircle: { ios: 'xmark.circle.fill', android: 'cancel' },
  minusCircle: { ios: 'minus.circle.fill', android: 'do_not_disturb_on' },
  sun: { ios: 'sun.max.fill', android: 'light_mode' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome' },
  plusBubble: { ios: 'plus.bubble.fill', android: 'add_comment' },
  camera2: { ios: 'camera.fill', android: 'photo_camera' },
  paperclip: { ios: 'paperclip', android: 'attach_file' },
  ellipsis: { ios: 'ellipsis', android: 'more_horiz' },
  paperplane: { ios: 'paperplane.fill', android: 'send' },
} as const satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  color,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
}) {
  const theme = useTheme();
  return <SymbolView name={ICONS[name]} size={size} tintColor={color ?? theme.text} />;
}
