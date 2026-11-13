/*
 * Website links that open in the mobile app: universal links on iPhone, app
 * links on Android. The app claims the same paths (mobile/app.config.ts,
 * LINK_PREFIXES and LINK_EXACT); these files tell Apple and Google the app may open them.
 *
 *   APPLE_TEAM_ID          the Apple Developer team id, e.g. AB12CD34EF
 *   ANDROID_CERT_SHA256    SHA-256 fingerprints of the app's signing keys
 *                          (Play app signing, and the upload key), comma
 *                          separated, as Play Console shows them
 */

export const APP_ID = 'com.themoondevs.portal';

/** Paths whose pages, and the pages under them, open in the app. */
export const APP_LINK_PREFIXES = [
  '/messages',
  '/projects',
  '/goals',
  '/plans',
  '/user',
  '/notifications',
  '/rest-day',
];
/** Paths that open in the app only as they are (`/meet/<code>` stays web). */
export const APP_LINK_EXACT = ['/meet'];

/** apple-app-site-association, or null without APPLE_TEAM_ID. */
export function appleAppSiteAssociation() {
  const team = process.env.APPLE_TEAM_ID?.trim();
  if (!team) return null;
  return {
    applinks: {
      details: [
        {
          appIDs: [`${team}.${APP_ID}`],
          components: [
            ...APP_LINK_EXACT.map((path) => ({ '/': path })),
            // The page itself and the pages under it, not "/users".
            ...APP_LINK_PREFIXES.flatMap((path) => [
              { '/': path },
              { '/': `${path}/*` },
            ]),
          ],
        },
      ],
    },
  };
}

/** Android's assetlinks.json, or null without ANDROID_CERT_SHA256. */
export function assetLinks() {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? '')
    .split(',')
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean);
  if (!fingerprints.length) return null;
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: APP_ID,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}
