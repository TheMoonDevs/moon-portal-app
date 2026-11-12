import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, monthRange, monthTitle, shiftMonth, todayKey } from '@/lib/dates';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** The month's days in weeks, Monday first, with blanks around it. */
function weeksOf(month: string) {
  const { from, to } = monthRange(month);
  const first = new Date(`${from}T12:00:00`);
  const lead = (first.getDay() + 6) % 7;
  const days: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  while (days.length % 7) days.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

/**
 * A month calendar. Each day shows its number and whatever `mark` gives it
 * (a dot, a tick); `tone` colours the day's square.
 */
export function MonthGrid({
  month,
  onMonth,
  onDay,
  mark,
  tone,
  selected,
  canGoForward = true,
}: {
  month: string;
  onMonth: (month: string) => void;
  onDay?: (day: string) => void;
  mark?: (day: string) => ReactNode;
  tone?: (day: string) => string | null | undefined;
  selected?: string | null;
  canGoForward?: boolean;
}) {
  const theme = useTheme();
  const today = todayKey();
  const shift = (n: number) => onMonth(shiftMonth(month, n));
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <IconButton name="back" label="Previous month" onPress={() => shift(-1)} />
        <ThemedText type="smallBold" style={styles.title}>
          {monthTitle(month)}
        </ThemedText>
        <View style={!canGoForward && styles.hidden}>
          <IconButton name="forward" label="Next month" onPress={() => canGoForward && shift(1)} />
        </View>
      </View>
      <View style={styles.week}>
        {WEEKDAYS.map((d, i) => (
          <ThemedText key={i} type="small" themeColor="textSecondary" style={styles.weekday}>
            {d}
          </ThemedText>
        ))}
      </View>
      {weeksOf(month).map((week, w) => (
        <View key={w} style={styles.week}>
          {week.map((day, i) =>
            day ? (
              <Pressable
                key={day}
                disabled={!onDay}
                onPress={() => onDay?.(day)}
                style={({ pressed }) => [
                  styles.day,
                  {
                    backgroundColor: tone?.(day) ?? 'transparent',
                    borderColor: selected === day ? theme.accent : day === today ? theme.textSecondary : 'transparent',
                    opacity: pressed ? 0.6 : day > today ? 0.45 : 1,
                  },
                ]}>
                <ThemedText type={day === today ? 'smallBold' : 'small'}>{Number(day.slice(8))}</ThemedText>
                <View style={styles.mark}>{mark?.(day)}</View>
              </Pressable>
            ) : (
              <View key={`blank-${i}`} style={[styles.day, styles.blank]} />
            ),
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  head: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center' },
  hidden: { opacity: 0 },
  week: { flexDirection: 'row', gap: Spacing.one },
  weekday: { flex: 1, textAlign: 'center' },
  day: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    borderWidth: 1.5,
  },
  blank: { borderColor: 'transparent' },
  mark: { height: 10, alignItems: 'center', justifyContent: 'center' },
});
