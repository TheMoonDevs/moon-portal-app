import { getStoreUrls } from '@/lib/mobile/storeLinks';
import { ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/*
 * What the mobile app checks when it opens. `minVersion` (MOBILE_MIN_VERSION,
 * e.g. 0.2.0) asks people on older store builds to update; small fixes reach
 * them through EAS Update without this. `latestVersion` is the newest version
 * in each store (MOBILE_LATEST_VERSION_IOS / _ANDROID, or MOBILE_LATEST_VERSION
 * for both): older builds show "Portal x.y is out" in Notifications, without
 * blocking anything. Set it once the store has approved and released it.
 */
export async function GET() {
  const minVersion = process.env.MOBILE_MIN_VERSION || '0.0.0';
  const latest = process.env.MOBILE_LATEST_VERSION || null;
  return ok({
    minVersion,
    latestVersion: {
      ios: process.env.MOBILE_LATEST_VERSION_IOS || latest,
      android: process.env.MOBILE_LATEST_VERSION_ANDROID || latest,
    },
    storeUrls: getStoreUrls(),
  });
}
