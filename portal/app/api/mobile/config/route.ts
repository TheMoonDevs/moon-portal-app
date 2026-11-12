import { ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/*
 * What the mobile app checks when it opens. `minVersion` (MOBILE_MIN_VERSION,
 * e.g. 0.2.0) asks people on older store builds to update; small fixes reach
 * them through EAS Update without this.
 */
export async function GET() {
  return ok({
    minVersion: process.env.MOBILE_MIN_VERSION || '0.0.0',
    storeUrls: {
      ios: process.env.MOBILE_APP_STORE_URL || null,
      android:
        process.env.MOBILE_PLAY_STORE_URL ||
        'https://play.google.com/store/apps/details?id=com.themoondevs.portal',
    },
  });
}
