import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Card, Notice, ProgressBar, QueryState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, portalUrl } from '@/lib/api';
import { dayTitle, todayKey } from '@/lib/dates';
import type { BadgeProgress } from '@/lib/types';

const METRIC: Record<string, string> = {
  POINTS: 'points',
  WORKLOG_STREAK: 'day worklog streak',
  WORKLOG_DAYS: 'days logged',
  TASKS_DONE: 'tasks done',
  MAJOR_TASKS_DONE: 'major tasks done',
  DAYS_ON_PORTAL: 'days on the portal',
};

/** Badges earned, and how close the rest are. */
export default function BadgesScreen() {
  const theme = useTheme();
  const query = useQuery({
    queryKey: ['badges'],
    queryFn: () => api<{ badges: BadgeProgress[]; metrics: Record<string, number> }>('/api/me/badges'),
  });
  const badges = query.data?.badges ?? [];
  const earned = badges.filter((b) => b.earnedAt);
  const next = badges
    .filter((b) => !b.earnedAt)
    .sort((a, b) => b.value / b.badge.threshold - a.value / a.badge.threshold);
  const metrics = query.data?.metrics ?? {};

  return (
    <Screen
      edgeTop={false}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }>
      <QueryState
        loading={query.isPending}
        error={query.data ? null : query.error}
        onRetry={() => void query.refetch()}
        what="your badges"
      />
      {query.data ? (
        <View style={styles.stats}>
          {['POINTS', 'WORKLOG_STREAK', 'TASKS_DONE'].map((key) => (
            <Card key={key} style={styles.stat}>
              <ThemedText type="subtitle">{(metrics[key] ?? 0).toLocaleString()}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                {METRIC[key]}
              </ThemedText>
            </Card>
          ))}
        </View>
      ) : null}
      {query.data && !badges.length ? <Notice title="No badges yet" /> : null}
      {earned.length ? (
        <ThemedText type="label" themeColor="textSecondary">
          Earned · {earned.length}
        </ThemedText>
      ) : null}
      <View style={styles.grid}>
        {earned.map((b) => (
          <Card key={b.badge.id} style={styles.badge}>
            <BadgeImage src={b.badge.imageUrl} />
            <ThemedText type="smallBold" style={styles.center} numberOfLines={2}>
              {b.badge.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              {b.earnedAt ? dayTitle(todayKey(new Date(b.earnedAt))) : ''}
            </ThemedText>
          </Card>
        ))}
      </View>
      {next.length ? (
        <ThemedText type="label" themeColor="textSecondary">
          Next up
        </ThemedText>
      ) : null}
      {next.map((b) => (
        <Card key={b.badge.id} style={styles.next}>
          <View style={styles.dim}>
            <BadgeImage src={b.badge.imageUrl} size={44} />
          </View>
          <View style={styles.flex}>
            <ThemedText type="smallBold">{b.badge.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {b.badge.description ||
                `${b.badge.threshold.toLocaleString()} ${METRIC[b.badge.metric] ?? b.badge.metric.toLowerCase()}`}
            </ThemedText>
            <ProgressBar percent={(b.value / Math.max(1, b.badge.threshold)) * 100} color={theme.accent} />
            <ThemedText type="small" themeColor="textSecondary">
              {b.value.toLocaleString()} of {b.badge.threshold.toLocaleString()}
            </ThemedText>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

function BadgeImage({ src, size = 64 }: { src?: string | null; size?: number }) {
  const theme = useTheme();
  if (!src) return <Icon name="trophy" size={size * 0.6} color={theme.textSecondary} />;
  return <Image source={{ uri: portalUrl(src) }} style={{ width: size, height: size }} contentFit="contain" />;
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: Spacing.one },
  center: { textAlign: 'center' },
  stats: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, alignItems: 'center', gap: Spacing.one },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  badge: { width: '31.5%', alignItems: 'center', gap: Spacing.one },
  next: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  dim: { opacity: 0.45 },
});
