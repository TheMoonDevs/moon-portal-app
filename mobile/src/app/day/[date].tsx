import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card, Dot, Notice, QueryState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { api, withQuery } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { clock, dayTitle } from '@/lib/dates';
import { POINT_LABEL, statusLabel } from '@/lib/tasks';
import type { Day } from '@/lib/types';

/** A past day: each task worked on, and what was logged on it. */
export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { profile } = useAuth();
  const query = useQuery({
    queryKey: ['day', date],
    queryFn: () => api<Day>(withQuery('/api/me/day', { date })),
  });
  const data = query.data;
  const points = (data?.points ?? []).filter((p) => p.date === date && p.userId === profile?.id);
  const worked = (data?.tasks ?? []).filter((t) => points.some((p) => p.taskId === t.id));
  const planned = (data?.tasks ?? []).filter((t) => !worked.includes(t) && !t.meeting);
  const projectOf = (id: string) => data?.projects.find((p) => p.id === id);

  return (
    <Screen
      edgeTop={false}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }>
      <Stack.Screen options={{ title: date ? dayTitle(date) : 'Day' }} />
      <QueryState
        loading={query.isPending}
        error={query.data ? null : query.error}
        onRetry={() => void query.refetch()}
        what="this day"
      />
      {data && !worked.length && !planned.length ? <Notice title="Nothing logged this day" /> : null}
      {worked.map((t) => (
        <Card key={t.id}>
          <View style={styles.row}>
            <Dot color={projectOf(t.projectId)?.color} />
            <ThemedText type="smallBold" style={styles.flex}>
              {t.title}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {projectOf(t.projectId)?.name ?? 'No project'} · now {statusLabel(t).toLowerCase()}
          </ThemedText>
          {points
            .filter((p) => p.taskId === t.id)
            .map((p) => (
              <View key={p.id} style={styles.point}>
                <ThemedText type="small" themeColor="textSecondary">
                  {clock(p.at)}
                  {p.status ? ` · ${POINT_LABEL[p.status] ?? p.status}` : ''}
                  {p.by !== 'person' ? ` · by ${p.by}` : ''}
                </ThemedText>
                {p.text ? <ThemedText>{p.text}</ThemedText> : null}
              </View>
            ))}
        </Card>
      ))}
      {planned.length ? (
        <View style={styles.group}>
          <ThemedText type="label" themeColor="textSecondary">
            Planned, nothing logged
          </ThemedText>
          {planned.map((t) => (
            <View key={t.id} style={styles.row}>
              <Dot color={projectOf(t.projectId)?.color} />
              <ThemedText style={styles.flex}>{t.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {statusLabel(t)}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  point: { gap: 2, paddingTop: Spacing.one },
  group: { gap: Spacing.two },
});
