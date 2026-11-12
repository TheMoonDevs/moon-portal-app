import { useQuery } from '@tanstack/react-query';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import { type ReactNode, useEffect } from 'react';
import { AppState, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PortalMark } from '@/components/portal-mark';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { api } from './api';
import { APP_VERSION } from './config';

/*
 * Keeping the app current. Small fixes arrive through EAS Update: they
 * download in the background and a "Restart to update" pill offers them. A
 * store build older than the portal's `minVersion` (/api/mobile/config) is
 * asked to update from the store instead.
 */

type MobileConfig = {
  minVersion: string;
  storeUrls: { ios: string | null; android: string | null };
};

/** -1, 0 or 1, comparing "1.2.3" style versions. */
export function compareVersions(a: string, b: string) {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

export const nativeVersion = () => Application.nativeApplicationVersion ?? APP_VERSION;

export function UpdateGate({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const config = useQuery({
    queryKey: ['mobileConfig'],
    queryFn: () => api<MobileConfig>('/api/mobile/config', { anonymous: true }),
    staleTime: 60 * 60 * 1000,
  });
  const { isUpdatePending } = Updates.useUpdates();

  // Look for a fix each time the app comes back to the front.
  useEffect(() => {
    if (!Updates.isEnabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void Updates.checkForUpdateAsync()
        .then((r) => (r.isAvailable ? Updates.fetchUpdateAsync() : null))
        .catch(() => null);
    });
    return () => sub.remove();
  }, []);

  const tooOld = !!config.data && compareVersions(nativeVersion(), config.data.minVersion) < 0;
  if (tooOld) {
    const store = Platform.OS === 'ios' ? config.data?.storeUrls.ios : config.data?.storeUrls.android;
    return (
      <View style={[styles.blocked, { backgroundColor: theme.background }]}>
        <PortalMark size={72} />
        <ThemedText type="subtitle">Update Portal</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.center}>
          This version is too old for the portal. Get the latest from the{' '}
          {Platform.OS === 'ios' ? 'App Store' : 'Play Store'} to carry on.
        </ThemedText>
        {store ? (
          <Button title="Open the store" onPress={() => void Linking.openURL(store)} style={styles.stretch} />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      {children}
      {isUpdatePending ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void Updates.reloadAsync().catch(() => null)}
          style={[
            styles.pill,
            { bottom: insets.bottom + 72, backgroundColor: theme.accent },
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
            Update ready · Restart
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  blocked: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  center: { textAlign: 'center' },
  stretch: { alignSelf: 'stretch' },
  pill: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.large,
  },
});
