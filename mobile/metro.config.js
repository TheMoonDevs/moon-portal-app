// Expo's Metro setup, plus Sentry's ids that match crash reports to the
// right source maps (lib/sentry.ts). Without a Sentry DSN it changes nothing.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
