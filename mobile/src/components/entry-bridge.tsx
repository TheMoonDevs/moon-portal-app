import * as QuickActions from 'expo-quick-actions';
import { router, usePathname } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { takeLink, useHeldLink } from '@/lib/incoming';
import { openLink } from '@/lib/links';

/*
 * Ways into the app from outside, while signed in (a link or share that
 * arrives signed out waits for the sign-in):
 * - portal links tapped in other apps (lib/incoming.ts),
 * - text, links and photos shared from other apps (the Share screen),
 * - the quick actions on the app icon (long-press it).
 */

const ios = Platform.OS === 'ios';
const ACTIONS: QuickActions.Action[] = [
  { id: 'new-task', title: 'New task', icon: ios ? 'symbol:plus.circle' : null, params: { href: '/new-task' } },
  { id: 'log', title: 'Log work', icon: ios ? 'symbol:square.and.pencil' : null, params: { href: '/log' } },
  { id: 'chats', title: 'Chats', icon: ios ? 'symbol:bubble.left.and.bubble.right' : null, params: { href: '/messages' } },
  { id: 'search', title: 'Search', icon: ios ? 'search' : null, params: { href: '/search' } },
];

/** The action that started the app is handled once, not on every sign-in. */
let startHandled = false;

const hrefOf = (action: QuickActions.Action | null | undefined) =>
  typeof action?.params?.href === 'string' ? action.params.href : null;

export function EntryBridge() {
  const held = useHeldLink();
  const pathname = usePathname();
  const { hasShareIntent } = useShareIntentContext();

  // A portal link: its screen, after the screens under it have mounted.
  useEffect(() => {
    if (!held) return;
    const link = takeLink();
    setTimeout(() => void openLink(link), 0);
  }, [held]);

  // Something shared: the Share screen says where it goes.
  useEffect(() => {
    if (hasShareIntent && pathname !== '/share') setTimeout(() => router.push('/share'), 0);
    // Only when something new arrives, not on every move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent]);

  // Quick actions exist only while signed in.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    void QuickActions.setItems(ACTIONS).catch(() => null);
    const open = (action: QuickActions.Action | null | undefined) => {
      const href = hrefOf(action);
      // The hrefs above are all app screens.
      if (href) setTimeout(() => router.push(href as never), 0);
    };
    if (!startHandled) {
      startHandled = true;
      open(QuickActions.initial);
    }
    const sub = QuickActions.addListener(open);
    return () => {
      sub?.remove();
      void QuickActions.setItems([]).catch(() => null);
    };
  }, []);

  return null;
}
