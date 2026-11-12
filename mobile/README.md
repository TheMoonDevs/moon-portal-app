# Portal mobile app

The Portal on iPhone and Android, built with [Expo](https://expo.dev) SDK 58
(React Native 0.88, React 19.3) and Expo Router. It talks to the portal API in
`../portal`; there is no separate backend.

This folder is standalone, like `portal/` and `home/`: its own `package.json`
and lockfile. Never install it together with the portal (the portal is on
React 18; two copies of React in one app break at runtime).

## What's in it

| Path | What |
| --- | --- |
| `src/app/` | Screens, one file per route (Expo Router). `(tabs)/` is the tab bar: Home, Work, Shortcuts, Chat, Settings. Sheets (`log`, `new-task`, `company`, `chat/new`) open over it; `person/[id]` is a person's page (`me` for your own). |
| `src/lib/auth.tsx` | Sign-in (Google or Apple), the saved token, renewal, sign-out. |
| `src/lib/api.ts` | Calls to the portal API with the token. |
| `src/lib/query.ts` | TanStack Query: the cache saved on the phone (offline), and work logged offline that is sent when back online. |
| `src/lib/chat.tsx` | Messages over Ably, as on the website: live chats, ticks, typing, online. Polls when Ably is off. |
| `src/lib/push.ts`, `src/components/push-bridge.tsx` | Push notifications: the token, Android channels, the badge, opening the right screen on tap. |
| `src/lib/links.ts` | Website links (from notifications) to app screens. |
| `src/lib/lock.tsx` | Face ID / fingerprint lock (Settings). |
| `src/lib/updates.tsx` | Over-the-air updates, and the "please update" screen below the portal's minimum version. |
| `src/lib/types.ts` | API shapes, copied from `portal/models`. |
| `app.config.ts` | Name, bundle ids, icons, plugins; reads `.env.local`. |
| `eas.json` | Build profiles (`development`, `preview`, `production`), each on its update channel. |

## How sign-in works

Same as the website: the person's sign-in code plus a Google account linked
to it.

1. The app signs in to Google natively and swaps the Google ID token for a
   Firebase ID token (Firebase Auth REST API, the portal's public web key).
2. It posts the code and Firebase token to `POST /api/mobile/auth/sign-in`.
   The portal checks both exactly as on the website (`portal/lib/auth/signIn.ts`)
   and returns a `pmob_…` token.
3. The token is kept in the phone's secure storage and sent as
   `Authorization: Bearer` on every call. All portal API routes accept it
   (`getSessionUser()` in `portal/lib/permissions/server.ts`).
4. Each signed-in phone shows under Settings → connections on the website and
   can be signed out there. The app renews the token weekly while in use;
   tokens last 180 days.

## Rules for adding packages (Expo is strict about versions)

- Install with `npx expo install <package>`, never `npm install <package>`.
  It picks the version that matches SDK 58.
- Check new libraries on [React Native Directory](https://reactnative.directory)
  for New Architecture support first.
- Run `npm run lint`, `npm run check-types` and `npm run doctor` before a PR.
  CI runs them too (`.github/workflows/mobile.yml`).
- Don't commit `ios/` or `android/`: they are generated from `app.config.ts`.
  Native settings go in `app.config.ts` and config plugins.
- Packages with native code need a new development build, not Expo Go.

## First-time setup (once)

These need the Expo, Apple and Google accounts, so they are done by hand.

1. **Expo project.** Done: the project is `themoondevs/portal`
   (`d32170fe-08dc-48ed-8b16-fe310cec6c6a`), set in `app.config.ts`.
   `eas init` can't write into a dynamic config, so its "Cannot
   automatically write" message is expected.
2. **Google sign-in client ids**, in the Google Cloud project behind the
   `themoondevs` Firebase project. The web and iOS ids are set in
   `app.config.ts` (they are not secrets):
   - Web: `731981843950-5ng0…` (Firebase → Authentication → Sign-in method →
     Google → Web SDK configuration).
   - iOS: `731981843950-9gg7…`, an iOS OAuth client for
     `com.themoondevs.portal`.
   - Android: Create OAuth client id → Android, package
     `com.themoondevs.portal`, with the keystore's SHA-1. Get it from
     `npx eas-cli@latest credentials -p android` → a build profile →
     Keystore → Set up a new keystore (or run the first Android build,
     which makes one), then the SHA-1 shows in the credentials summary.
     Add the Play App Signing SHA-1 from Play Console later as a second
     Android client. Android needs no variable.
   - The Google Service Account key under credentials is only for
     uploading to Play Store (`eas submit`) and, as an FCM V1 key, for
     Android push. Neither is needed to sign in.
3. **Sign in with Apple (iPhone).** The `usesAppleSignIn` setting turns the
   capability on; EAS adds it to the App ID on the next iOS build. A person
   links their Apple ID once in Settings (after signing in with Google);
   after that they can sign in with their code and Apple. The portal checks
   Apple's token against `APPLE_BUNDLE_IDS` (default `com.themoondevs.portal`).
4. **Push on iPhone.** EAS makes the push key on the first iOS build (say yes
   when it asks). `EXPO_ACCESS_TOKEN` on the portal only if enhanced push
   security is turned on for the Expo project.
5. **Android: `google-services.json`, before the first Android build.** In
   the Firebase console (`themoondevs` project) → Project settings → Add app
   → Android, package `com.themoondevs.portal`. Download
   `google-services.json` into this folder and commit it (it is not a
   secret: it ships inside the app). Or, to keep it out of git, upload it
   as a file variable named `GOOGLE_SERVICES_JSON` on expo.dev (Project →
   Environment variables, all environments). Android push needs it.
6. **Android push key (FCM V1).** Firebase → Project settings → Service
   accounts → Generate new private key. Then `npx eas-cli@latest credentials
   -p android` → development → Google Service Account → "Manage your Google
   Service Account Key for Push Notifications (FCM V1)" → upload that JSON.
7. **Android Google sign-in.** After the first Android build, add an Android
   OAuth client with the build's SHA-1 (step 2).

## Run it on your phone

1. Build a development build once per platform (and again after adding a
   native package):
   - iPhone: `npx eas-cli@latest device:create` to register it, then
     `npm run build:dev -- --platform ios`.
   - Android: `npm run build:dev -- --platform android`.
2. Install the build from the link EAS gives you.
3. `npm install`, then `npm start`, and open the project from the
   development build.

Sign-in needs a portal with the mobile API (`portal/app/api/mobile`). Until
that is deployed, point `EXPO_PUBLIC_PORTAL_URL` in `.env.local` at a portal
that has it.

## Updates without a new build

Only native changes (a new package with native code, a permission, an icon)
need a new build. Everything else ships as an update:

- While developing: `npm start`, and the development build reloads.
- To phones with a TestFlight, Play or store build:
  `npx eas-cli@latest update --channel preview` (or `production`). The app
  checks on launch and shows "Update ready · Restart".
- `runtimeVersion` follows the app version, so an update only reaches builds
  of the same version. Bump `version` in `app.config.ts` with every new
  native build.
- To stop old builds that can't take an update: set `MOBILE_MIN_VERSION` on
  the portal (with `MOBILE_APP_STORE_URL` / `MOBILE_PLAY_STORE_URL`). Older
  versions show a screen asking to update.

## Release

`npm run build:prod -- --platform all`, then `npm run submit -- --platform ios`
(or `android`). The store listing steps are in the plan doc linked from the
pull request that added this folder. App Review needs a demo sign-in code
and account; account deletion is in Settings → Delete my account.
