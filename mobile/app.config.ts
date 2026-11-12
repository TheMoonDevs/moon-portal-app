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

const DARK = "#0a0a0b";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Portal",
  slug: "portal",
  owner: env.EAS_OWNER || "themoondevs" || undefined,
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "portal",
  userInterfaceStyle: "automatic",
  backgroundColor: DARK,
  ios: {
    bundleIdentifier: "com.themoondevs.portal",
    supportsTablet: false,
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
    eas: {
      projectId: "d32170fe-08dc-48ed-8b16-fe310cec6c6a",
    },
    portalUrl: PORTAL_URL,
    googleWebClientId: GOOGLE_WEB_CLIENT_ID ?? null,
    googleIosClientId: GOOGLE_IOS_CLIENT_ID ?? null,
    ...(EAS_PROJECT_ID && { eas: { projectId: EAS_PROJECT_ID } }),
  },
});
