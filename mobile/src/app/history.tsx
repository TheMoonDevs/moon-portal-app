import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { MonthGrid } from '@/components/month-grid';
import { ThemedText } from '@/components/themed-text';
import { Card, Dot, QueryState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, withQuery } from '@/lib/api';
import { dayTitle, monthOf, monthRange, todayKey } from '@/lib/dates';
import { POINT_LABEL } from '@/lib/tasks';
import type { Days, MonthScore } from '@/lib/types';

/** The worklog, a month at a time: which days have work, and the score. */
export default function HistoryScreen() {
  const theme = useTheme();
  const today = todayKey();
  const [month, setMonth] = useState(monthOf(today));
  const [selected, setSelected] = useState<string | null>(null);
  const { from, to } = monthRange(month);
  const days = useQuery({
    queryKey: ['days', from, to],
    queryFn: () => api<Days>(withQuery('/api/me/days', { from, to })),
  });
  const score = useQuery({
    queryKey: ['month', month],
    queryFn: () => api<MonthScore>(withQuery('/api/me/month', { month })),
  });
  const linesOf = (day: string) => days.data?.days[day] ?? [];
  const shownDay = selected && monthOf(selected) === month ? selected : null;
  const logged = Object.values(days.data?.days ?? {}).filter((l) => l.length).length;

  return (
    <Screen
      edgeTop={false}
      refreshControl={
        <RefreshControl
          refreshing={days.isRefetching}
          onRefresh={() => {
            void days.refetch();
            void score.refetch();
          }}
        />
      }>
      <View style={styles.stats}>
        <Stat value={score.data?.points} label="points" />
        <Stat value={score.data?.days ?? logged} label="days logged" />
        <Stat value={score.data?.finished} label="tasks finished" />
      </View>
      <Card>
        <MonthGrid
          month={month}
          onMonth={(m) => {
            setMonth(m);
            setSelected(null);
          }}
          canGoForward={month < monthOf(today)}
          selected={shownDay}
          onDay={(day) => (day > today ? undefined : setSelected(day))}
          tone={(day) => (linesOf(day).length ? theme.backgroundSelected : null)}
          mark={(day) => {
            const lines = linesOf(day);
            if (!lines.length) return null;
            const missed = lines.some((l) => l.goalMissed);
            const done = lines.some((l) => l.status === 'done');
            return <Dot size={5} color={missed ? theme.danger : done ? theme.success : theme.textSecondary} />;
          }}
        />
      </Card>
      <QueryState
        loading={days.isPending}
        error={days.data ? null : days.error}
        onRetry={() => void days.refetch()}
        what="your worklog"
      />
      {shownDay ? (
        <Card>
          <View style={styles.row}>
            <ThemedText type="smallBold" style={styles.flex}>
              {dayTitle(shownDay, today)}
            </ThemedText>
            <ThemedText
              type="smallBold"
              themeColor="textSecondary"
              onPress={() => router.push({ pathname: '/day/[date]', params: { date: shownDay } })}>
              Open day ›
            </ThemedText>
          </View>
          {linesOf(shownDay).length ? (
            linesOf(shownDay).map((line, i) => (
              <View key={i} style={styles.line}>
                <ThemedText style={styles.flex}>{line.text}</ThemedText>
                {line.status ? (
                  <ThemedText type="small" themeColor={line.status === 'done' ? 'success' : 'textSecondary'}>
                    {line.status === 'archived' ? 'Archived' : (POINT_LABEL[line.status] ?? line.status)}
                  </ThemedText>
                ) : null}
              </View>
            ))
          ) : (
            <ThemedText themeColor="textSecondary">Nothing logged.</ThemedText>
          )}
        </Card>
      ) : days.data ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Tap a day to see what was logged.
        </ThemedText>
      ) : null}
    </Screen>
  );
}

function Stat({ value, label }: { value?: number; label: string }) {
  return (
    <Card style={styles.stat}>
      <ThemedText type="subtitle">{value === undefined ? '–' : value.toLocaleString()}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        {label}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stats: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, alignItems: 'center', gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center' },
  line: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  center: { textAlign: 'center' },
});
