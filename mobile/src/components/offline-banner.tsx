import { onlineManager, useMutationState } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const subscribe = (cb: () => void) => onlineManager.subscribe(cb);
const online = () => onlineManager.isOnline();

/** Whether the phone is online, as the data layer sees it. */
export function useOnline() {
  return useSyncExternalStore(subscribe, online, online);
}

/** "Offline · 2 updates will send when you're back online". */
export function OfflineBanner() {
  const theme = useTheme();
  const isOnline = useOnline();
  const waiting = useMutationState({
    filters: { status: 'pending' },
    select: (m) => m.state.isPaused,
  }).filter(Boolean).length;
  if (isOnline && !waiting) return null;
  return (
    <View style={[styles.banner, { backgroundColor: theme.backgroundSelected }]}>
      <Icon name="cloudOff" size={16} color={theme.textSecondary} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
        {isOnline ? 'Sending' : 'Offline'}
        {waiting
          ? ` · ${waiting} update${waiting === 1 ? '' : 's'} ${isOnline ? 'going out now' : 'will send when you’re back online'}`
          : ' · showing what was last loaded'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
  },
  text: { flex: 1 },
});
