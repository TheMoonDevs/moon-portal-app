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
| `src/app/` | Screens, one file per route (Expo Router). `(tabs)/` is the tab bar: Today, Tasks, Messages, More. |
| `src/lib/auth.tsx` | Sign-in, the saved token, renewal, sign-out. |
| `src/lib/api.ts` | Calls to the portal API with the token. |
| `src/lib/google.ts` | Google sign-in on the phone, swapped for a Firebase ID token. |
| `src/lib/company.tsx` | The person's companies and the one the app shows. |
| `src/lib/types.ts` | API shapes, copied from `portal/models`. |
| `app.config.ts` | Name, bundle ids, icons, plugins; reads `.env.local`. |
| `eas.json` | Build profiles: `development`, `preview`, `production`. |

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
   `themoondevs` Firebase project:
   - Web client id: Firebase console → Authentication → Sign-in method →
     Google → Web SDK configuration. Set it as `GOOGLE_WEB_CLIENT_ID`.
   - iOS: Google Cloud console → APIs & Services → Credentials → Create
     OAuth client id → iOS, bundle id `com.themoondevs.portal`. Set it as
     `GOOGLE_IOS_CLIENT_ID`.
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
   Add both variables to `.env.local` and the EAS environments.
3. **Push (later step).** `EXPO_ACCESS_TOKEN` on the portal only if enhanced
   push security is turned on for the Expo project.

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

## Release

`npm run build:prod -- --platform all`, then `npm run submit -- --platform ios`
(or `android`). The store listing steps are in the plan doc linked from the
pull request that added this folder.
