import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import { authHeaders, portalUrl } from './api';
import { PORTAL_URL } from './config';

/**
 * Joins a meeting through the portal's join link, signed in as the person,
 * so the portal notes the join on their worklog like the website does. The
 * link redirects to the meeting room, which opens in the Meet app when it
 * is installed, else in the browser.
 */
export async function joinMeeting(joinUrl: string) {
  const start = portalUrl(joinUrl);
  let room = start;
  try {
    const res = await fetch(start, { headers: authHeaders() });
    room = res.url || start;
  } catch {
    // Offline or blocked: the in-app browser shows what went wrong.
  }
  if (new URL(room).host === new URL(PORTAL_URL).host) {
    await WebBrowser.openBrowserAsync(room).catch(() => null);
    return;
  }
  await Linking.openURL(room).catch(() => WebBrowser.openBrowserAsync(room).catch(() => null));
}
