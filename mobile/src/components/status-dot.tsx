import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { pickOf, type StatusPick } from '@/lib/status';

/** A status as a dot: an open ring for to do, its colour for the rest. */
export function StatusDot({ status, size = 12 }: { status: StatusPick; size?: number }) {
  const theme = useTheme();
  const color = pickOf(status).color;
  return (
    <View
      style={[
        styles.dot,
        { width: size, height: size, borderRadius: size / 2 },
        color
          ? { backgroundColor: color }
          : { borderWidth: Math.max(1.5, size / 7), borderColor: theme.textSecondary },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: { flexShrink: 0 },
});
