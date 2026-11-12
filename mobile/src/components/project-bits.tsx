import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PULSES, type Pulse } from '@/lib/overview';
import type { PublicUser } from '@/lib/types';

/*
 * The small pieces of a project card, as on the website's projects page:
 * a ring for the month's progress, a strip for the last 7 days, the faces
 * of who worked on it, and the dot that says how it is doing.
 */

/** A ring that fills with the month's progress, the percent inside. */
export function ProgressRing({ percent, color, size = 42 }: { percent: number; color: string; size?: number }) {
  const theme = useTheme();
  const stroke = 3.5;
  const r = (size - stroke) / 2 - 1;
  const length = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={styles.rotate}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={theme.border} strokeWidth={stroke} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${length} ${length}`}
          strokeDashoffset={length * (1 - Math.min(100, percent) / 100)}
        />
      </Svg>
      <View style={styles.center}>
        {percent >= 100 ? (
          <Icon name="check" size={16} color={theme.text} />
        ) : (
          <ThemedText style={styles.percent}>{percent}</ThemedText>
        )}
      </View>
    </View>
  );
}

/** Seven bars, one per day ending today, stronger for more work. */
export function ActivityStrip({ days, color }: { days: number[]; color: string }) {
  const theme = useTheme();
  const max = Math.max(1, ...days);
  return (
    <View style={styles.strip}>
      {days.map((n, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            n
              ? { backgroundColor: color, opacity: 0.35 + 0.65 * (n / max) }
              : { backgroundColor: theme.backgroundSelected },
          ]}
        />
      ))}
    </View>
  );
}

/** Up to three faces, overlapping, and how many more. */
export function AvatarStack({ people, max = 3 }: { people: PublicUser[]; max?: number }) {
  const theme = useTheme();
  const shown = people.slice(0, max);
  return (
    <View style={styles.stack}>
      {shown.map((p, i) => (
        <View key={p.id} style={[styles.face, i > 0 && styles.overlap, { borderColor: theme.backgroundElement }]}>
          <Avatar uri={p.avatar} name={p.name} size={22} />
        </View>
      ))}
      {people.length > max ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.more}>
          +{people.length - max}
        </ThemedText>
      ) : null}
    </View>
  );
}

/** How a project is doing, as a coloured dot. */
export function PulseDot({ pulse, size = 8 }: { pulse: Pulse; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: PULSES[pulse].color }} />
  );
}

/** A filter as a pill; filled when on. */
export function FilterChip({
  label,
  on,
  onPress,
  mark,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  mark?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: on ? theme.accent : theme.backgroundElement,
          borderColor: on ? theme.accent : theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      {mark}
      <ThemedText type="smallBold" style={{ color: on ? theme.onAccent : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 3,
  },
  rotate: { transform: [{ rotate: '-90deg' }] },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  percent: { fontSize: 11, lineHeight: 13, fontWeight: 700 },
  strip: { flex: 1, flexDirection: 'row', gap: 4, height: 8 },
  bar: { flex: 1, borderRadius: 4 },
  stack: { flexDirection: 'row', alignItems: 'center' },
  face: { borderWidth: 2, borderRadius: 13 },
  overlap: { marginLeft: -8 },
  more: { marginLeft: 4 },
});
