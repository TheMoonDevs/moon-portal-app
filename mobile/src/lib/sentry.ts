import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';
import type { ComponentType } from 'react';

/*
 * Crash reports from real phones (Sentry), with the screens and taps that led
 * there. Only when the build has EXPO_PUBLIC_SENTRY_DSN; without it nothing
 * is sent. No names or emails go with a report, only the person's portal id.
 */

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (dsn && !__DEV__) {
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    environment: Updates.channel || 'production',
    // A few traces to see slow screens; crashes are always sent.
    tracesSampleRate: 0.1,
    integrations: [Sentry.expoRouterIntegration()],
  });
}

const on = !!dsn && !__DEV__;

/** Wraps the app so crashes in React are reported too. */
export function withCrashReports<P extends object>(App: ComponentType<P>): ComponentType<P> {
  return on ? (Sentry.wrap(App as ComponentType<Record<string, unknown>>) as ComponentType<P>) : App;
}

/** Ties reports to the signed-in person (their id only), or to no one. */
export function setCrashUser(id: string | null) {
  if (on) Sentry.setUser(id ? { id } : null);
}
