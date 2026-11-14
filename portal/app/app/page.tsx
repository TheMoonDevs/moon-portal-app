import type { Metadata } from 'next';

import { APP_STORE_SEARCH_URL, getStoreUrls } from '@/lib/mobile/storeLinks';

import { GetTheApp } from './GetTheApp';

/*
 * The link to share for the mobile app (portal.themoondevs.com/app): the
 * download screen on any device, open without signing in.
 */
export const metadata: Metadata = {
  title: 'Get the Portal app',
  description:
    'Portal is on the App Store and Google Play. Your tasks, worklogs and chats in one tap.',
  openGraph: {
    title: 'Get the Portal app',
    description: 'Now on iPhone and Android.',
  },
};

export default function AppPage() {
  const urls = getStoreUrls();
  return (
    <GetTheApp
      storeUrls={{
        ios: urls.ios ?? APP_STORE_SEARCH_URL,
        android: urls.android,
      }}
    />
  );
}
