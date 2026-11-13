/// <reference types="node" />
import { existsSync } from "node:fs";

import type { ConfigContext, ExpoConfig } from "expo/config";

/*
 * The app's settings. Values that differ per machine or build come from
 * environment variables (see .env.example); EAS reads them from the
 * project's environment variables on expo.dev.
 */

const env = process.env;

/** The portal the app talks to. */
const PORTAL_URL =
  env.EXPO_PUBLIC_PORTAL_URL || "https://portal.themoondevs.com";

/** Set by `eas init`; needed for builds, push notifications and updates. */
const EAS_PROJECT_ID = env.EAS_PROJECT_ID;

/**
 * Google sign-in. The web client id is the one Firebase made for the
 * `themoondevs` project; the iOS client id and its reversed form (the URL
 * scheme) come from the iOS OAuth client in Google Cloud. Client ids are not
 * secrets. Android needs none here: its OAuth client is matched by package
 * name and signing SHA-1. See README.md.
 */
const GOOGLE_WEB_CLIENT_ID =
  env.GOOGLE_WEB_CLIENT_ID ||
  "731981843950-5ng0qmtuhu4hr5shnv9fokuvtnehk721.apps.googleusercontent.com";
const GOOGLE_IOS_CLIENT_ID =
  env.GOOGLE_IOS_CLIENT_ID ||
  "731981843950-9gg7n9848di69shb8vigogse1rhrmcag.apps.googleusercontent.com";
const GOOGLE_IOS_URL_SCHEME = GOOGLE_IOS_CLIENT_ID
  ? `com.googleusercontent.apps.${GOOGLE_IOS_CLIENT_ID.replace(".apps.googleusercontent.com", "")}`
  : undefined;

/**
 * Firebase's Android config, needed for push on Android. EAS builds can get
 * it from a file environment variable (GOOGLE_SERVICES_JSON); locally it is
 * mobile/google-services.json. Without it Android builds still work, only
 * without push.
 */
const GOOGLE_SERVICES_JSON =
  env.GOOGLE_SERVICES_JSON ||
  (existsSync("./google-services.json") ? "./google-services.json" : undefined);

const PROJECT_ID = EAS_PROJECT_ID || "d32170fe-08dc-48ed-8b16-fe310cec6c6a";

const DARK = "#0a0a0b";

/**
 * Links to these website pages open in the app (universal links on iPhone,
 * app links on Android). The portal serves the matching
 * /.well-known/apple-app-site-association and assetlinks.json.
 */
const LINK_HOST = "portal.themoondevs.com";
const LINK_PREFIXES = [
  "/messages",
  "/projects",
  "/goals",
  "/plans",
  "/user",
  "/notifications",
  "/rest-day",
];
/** Only these exact pages: booking links under /meet/ stay on the web. */
const LINK_EXACT = ["/meet"];

/**
 * Crash reports (Sentry). The app sends them when EXPO_PUBLIC_SENTRY_DSN is
 * set; source maps upload during the build only with SENTRY_AUTH_TOKEN,
 * SENTRY_ORG and SENTRY_PROJECT, so a build without them still works.
 */
const SENTRY_UPLOAD =
  env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT
    ? { organization: env.SENTRY_ORG, project: env.SENTRY_PROJECT }
    : null;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Portal",
  slug: "portal",
  owner: env.EAS_OWNER || "themoondevs" || undefined,
  version: "1.1.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "portal",
  userInterfaceStyle: "automatic",
  backgroundColor: DARK,
  ios: {
    bundleIdentifier: "com.themoondevs.portal",
    // iPad: portrait, with two columns where there is room (components/ui.tsx).
    supportsTablet: true,
    requireFullScreen: true,
    usesAppleSignIn: true,
    associatedDomains: [`applinks:${LINK_HOST}`],
    infoPlist: {
      // The app uses only standard HTTPS, so no export compliance forms.
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.themoondevs.portal",
    adaptiveIcon: {
      backgroundColor: DARK,
      foregroundImage: "./assets/images/android-icon-foreground.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          // The page itself and the pages under it, not "/users".
          ...LINK_PREFIXES.flatMap((path) => [
            { scheme: "https", host: LINK_HOST, path },
            { scheme: "https", host: LINK_HOST, pathPrefix: `${path}/` },
          ]),
          ...LINK_EXACT.map((path) => ({ scheme: "https", host: LINK_HOST, path })),
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
    ...(GOOGLE_SERVICES_JSON && { googleServicesFile: GOOGLE_SERVICES_JSON }),
  },
  // Small fixes reach phones without a store update (EAS Update). A new
  // native piece needs a new build: bump `version` and the runtime follows.
  runtimeVersion: { policy: "appVersion" },
  updates: {
    url: `https://u.expo.dev/${PROJECT_ID}`,
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 0,
  },
  web: {
    output: "single",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: DARK,
        image: "./assets/images/splash-icon.png",
        imageWidth: 120,
        dark: { backgroundColor: DARK },
      },
    ],
    "expo-secure-store",
    "expo-apple-authentication",
    [
      "expo-local-authentication",
      { faceIDPermission: "Portal uses Face ID to keep your work locked." },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/images/notification-icon.png",
        color: DARK,
        defaultChannel: "default",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Portal uses your photos to set your profile photo and send photos in chats.",
        cameraPermission:
          "Portal uses the camera to take your profile photo and photos for chats.",
        microphonePermission:
          "Portal uses the microphone when you record a video for a chat.",
      },
    ],
    [
      "expo-calendar",
      {
        writeOnlyAccess: true,
        writeOnlyCalendarPermission: "Portal adds your meetings to your calendar.",
        calendarPermission: "Portal adds your meetings to your calendar.",
      },
    ],
    "expo-sharing",
    "expo-video",
    "expo-updates",
    [
      // Share text, a link or a photo from other apps into a task, a
      // worklog or a chat.
      "expo-share-intent",
      {
        iosActivationRules: {
          NSExtensionActivationSupportsText: true,
          NSExtensionActivationSupportsWebURLWithMaxCount: 1,
          NSExtensionActivationSupportsWebPageWithMaxCount: 1,
          NSExtensionActivationSupportsImageWithMaxCount: 1,
        },
        androidIntentFilters: ["text/*", "image/*"],
        iosShareExtensionName: "Portal Share",
      },
    ],
    ...(SENTRY_UPLOAD
      ? [["@sentry/react-native/expo", SENTRY_UPLOAD] as [string, Record<string, string>]]
      : []),
    ...(GOOGLE_IOS_URL_SCHEME
      ? [
          [
            "@react-native-google-signin/google-signin",
            { iosUrlScheme: GOOGLE_IOS_URL_SCHEME },
          ] as [string, Record<string, string>],
        ]
      : []),
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: { projectId: PROJECT_ID },
    portalUrl: PORTAL_URL,
    googleWebClientId: GOOGLE_WEB_CLIENT_ID ?? null,
    googleIosClientId: GOOGLE_IOS_CLIENT_ID ?? null,
  },
});
