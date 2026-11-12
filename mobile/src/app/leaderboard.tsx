import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { CompanyChip } from '@/components/company-chip';
import { ThemedText } from '@/components/themed-text';
import { Avatar, Card, IconButton, Notice, QueryState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, portalUrl, withQuery } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCompany } from '@/lib/company';
import { monthOf, monthTitle, shiftMonth, todayKey } from '@/lib/dates';
import type { LeaderboardRow } from '@/lib/types';

const MEDALS = ['🥇', '🥈', '🥉'];

/** The company's month: points, tasks done and days logged, by person. */
export default function LeaderboardScreen() {
  const theme = useTheme();
  const { company } = useCompany();
  const { profile } = useAuth();
  const thisMonth = monthOf(todayKey());
  const [month, setMonth] = useState(thisMonth);
  const query = useQuery({
    queryKey: ['leaderboard', company?.id, month],
    queryFn: () =>
      api<{ month: string; rows: LeaderboardRow[] }>(
        withQuery('/api/leaderboard', { companyId: company?.id, month }),
      ),
    enabled: !!company,
  });
  const rows = query.data?.rows ?? [];
  const mine = rows.find((r) => r.user.id === profile?.id);

  return (
    <Screen
      edgeTop={false}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }>
      <CompanyChip />
      <View style={styles.month}>
        <IconButton name="back" label="Previous month" onPress={() => setMonth(shiftMonth(month, -1))} />
        <ThemedText type="smallBold" style={styles.monthTitle}>
          {monthTitle(month)}
        </ThemedText>
        <View style={month >= thisMonth && styles.hidden}>
          <IconButton
            name="forward"
            label="Next month"
            onPress={() => month < thisMonth && setMonth(shiftMonth(month, 1))}
          />
        </View>
      </View>
      {mine ? (
        <Card style={styles.mine}>
          <ThemedText type="title">#{mine.rank}</ThemedText>
          <View style={styles.flex}>
            <ThemedText type="smallBold">You · {mine.points.toLocaleString()} points</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {mine.tasksDone} tasks done · {mine.worklogDays} days logged
              {mine.buff ? ` · ${mine.buff.title}` : ''}
            </ThemedText>
          </View>
          {mine.buff ? (
            <Image source={{ uri: portalUrl(mine.buff.src) }} style={styles.buff} contentFit="contain" />
          ) : null}
        </Card>
      ) : null}
      <QueryState
        loading={query.isPending && !!company}
        error={query.data ? null : query.error}
        onRetry={() => void query.refetch()}
        what="the leaderboard"
      />
      {query.data && !rows.length ? <Notice title="No points yet this month" /> : null}
      <View>
        {rows.map((r) => (
          <View
            key={r.user.id}
            style={[
              styles.row,
              { borderColor: theme.border },
              r.user.id === profile?.id && { backgroundColor: theme.backgroundSelected },
            ]}>
            <ThemedText type="smallBold" style={styles.rank}>
              {MEDALS[r.rank - 1] ?? r.rank}
            </ThemedText>
            <Avatar uri={r.user.avatar} name={r.user.name} size={36} />
            <View style={styles.flex}>
              <ThemedText numberOfLines={1}>{r.user.name ?? r.user.username ?? 'Someone'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {r.tasksDone} tasks · {r.worklogDays} days{r.buff ? ` · ${r.buff.title}` : ''}
              </ThemedText>
            </View>
            <ThemedText type="smallBold">{r.points.toLocaleString()}</ThemedText>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  month: { flexDirection: 'row', alignItems: 'center' },
  monthTitle: { flex: 1, textAlign: 'center' },
  hidden: { opacity: 0 },
  mine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  buff: { width: 44, height: 44 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rank: { width: 28, textAlign: 'center' },
});
