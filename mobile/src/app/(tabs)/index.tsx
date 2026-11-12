import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { CompanyChip } from '@/components/company-chip';
import { OfflineBanner } from '@/components/offline-banner';
import { TaskList } from '@/components/task-list';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, IconButton, Notice, QueryState, Row, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { api, withQuery } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCompany } from '@/lib/company';
import { greeting, todayKey } from '@/lib/dates';
import { unreadCount, useNotifications } from '@/lib/notifications';
import type { Day } from '@/lib/types';

/** Today: the day's tasks in the chosen company, as on the website's home. */
export default function TodayScreen() {
  const { profile } = useAuth();
  const { company, loading: companiesLoading } = useCompany();
  const notifications = useNotifications();
  const date = todayKey();
  const day = useQuery({
    queryKey: ['day', date],
    queryFn: () => api<Day>(withQuery('/api/me/day', { date })),
  });

  const all = day.data?.tasks ?? [];
  const tasks = all.filter((t) => !company || t.companyId === company.id || (!t.companyId && company.isPersonal));
  const meetings = tasks
    .filter((t) => t.meeting && t.status !== 'DONE')
    .sort((a, b) => (a.meeting!.start < b.meeting!.start ? -1 : 1));
  const work = tasks.filter((t) => !t.meeting);
  const open = work.filter((t) => t.status !== 'DONE');
  const done = work.filter((t) => t.status === 'DONE');
  const pointsToday = (day.data?.points ?? []).filter(
    (p) => p.date === date && p.userId === profile?.id,
  ).length;
  const firstName = profile?.name?.split(' ')[0];

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={day.isRefetching} onRefresh={() => void day.refetch()} />
      }>
      <View style={styles.top}>
        <View style={styles.flex}>
          <ThemedText type="title">
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {day.data
              ? `${open.length} open · ${done.length} done · ${pointsToday} update${pointsToday === 1 ? '' : 's'} logged`
              : 'Loading your day…'}
          </ThemedText>
        </View>
        <IconButton
          name="bell"
          label="Notifications"
          count={unreadCount(notifications.data)}
          onPress={() => router.push('/notifications')}
        />
      </View>

      <OfflineBanner />

      <View style={styles.actions}>
        <Button title="Log work" onPress={() => router.push('/log')} style={styles.flex} />
        <Button title="Add task" kind="secondary" onPress={() => router.push('/new-task')} style={styles.flex} />
      </View>

      <CompanyChip />

      {meetings.length ? (
        <Card>
          <ThemedText type="label" themeColor="textSecondary">
            Meetings today
          </ThemedText>
          {meetings.map((t) => (
            <Row
              key={t.id}
              icon="video"
              title={t.meeting!.time}
              detail={`With ${t.meeting!.with}${t.meeting!.status !== 'CONFIRMED' ? ' · not confirmed yet' : ''}`}
              onPress={() => router.push({ pathname: '/task/[id]', params: { id: t.id } })}
              chevron
            />
          ))}
        </Card>
      ) : null}

      <QueryState
        loading={day.isPending}
        error={day.data ? null : day.error}
        onRetry={() => void day.refetch()}
        what="today"
      />
      {day.data && !companiesLoading && work.length === 0 ? (
        <Notice title="Nothing planned today" body="Add a task, or log what you worked on.">
          <Button title="Add a task" kind="secondary" onPress={() => router.push('/new-task')} />
        </Notice>
      ) : null}
      {open.length ? <TaskList tasks={open} projects={day.data?.projects ?? []} showDay /> : null}
      {done.length ? (
        <>
          <ThemedText type="label" themeColor="textSecondary">
            Done today
          </ThemedText>
          <TaskList tasks={done} projects={day.data?.projects ?? []} />
        </>
      ) : null}

      <Card>
        <Row
          icon="history"
          title="Worklog history"
          detail="Your past days and this month’s score"
          onPress={() => router.push('/history')}
          chevron
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.two },
});
