import { getShareExtensionKey } from 'expo-share-intent';

import { PORTAL_URL } from '@/lib/config';
import { holdLink } from '@/lib/incoming';

/*
 * Links that open the app from outside, before Expo Router sees them:
 * - Something shared from another app on iPhone arrives as
 *   `portal://dataUrl=portalShareKey…`; the share sheet reads it from
 *   expo-share-intent (components/entry-bridge.tsx), so no screen here.
 * - Website links (https://portal.themoondevs.com/projects/…) are held until
 *   someone is signed in, then open their app screen (lib/incoming.ts).
 * Anything else, like `portal://` links, goes through as it is.
 */

const portalHost = (() => {
  try {
    return new URL(PORTAL_URL).host;
  } catch {
    return 'portal.themoondevs.com';
  }
})();

export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  // The first screen must be a real one; later links can be dropped.
  const stay = initial ? '/' : null;
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) return stay;
    if (/^https?:\/\//i.test(path)) {
      const url = new URL(path);
      if (url.host === portalHost) holdLink(`${url.pathname}${url.search}`);
      return stay;
    }
    return path;
  } catch {
    return stay ?? path;
  }
}
