import { useQuery } from '@tanstack/react-query';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { CompanyChip } from '@/components/company-chip';
import { TaskList } from '@/components/task-list';
import { ThemedText } from '@/components/themed-text';
import { Button, Notice, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCompany } from '@/lib/company';
import { greeting, todayKey } from '@/lib/dates';
import type { Day } from '@/lib/types';

/** Today: the day's tasks in the chosen company, as on the website's home. */
export default function TodayScreen() {
  const { profile } = useAuth();
  const { company, loading: companiesLoading } = useCompany();
  const date = todayKey();
  const day = useQuery({
    queryKey: ['day', date],
    queryFn: () => api<Day>(`/api/me/day?date=${date}`),
  });

  const tasks = (day.data?.tasks ?? []).filter((t) => !company || t.companyId === company.id);
  const open = tasks.filter((t) => t.status !== 'DONE');
  const firstName = profile?.name?.split(' ')[0];

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={day.isRefetching} onRefresh={() => void day.refetch()} />
      }>
      <View style={styles.header}>
        <ThemedText type="title">
          {greeting()}
          {firstName ? `, ${firstName}` : ''}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {day.data
            ? `${open.length} open · ${tasks.length - open.length} done today`
            : 'Loading your day…'}
        </ThemedText>
      </View>
      <CompanyChip />

      {day.error ? (
        <Notice title="Couldn’t load today" body={day.error.message}>
          <Button title="Try again" kind="secondary" onPress={() => void day.refetch()} />
        </Notice>
      ) : day.data && !companiesLoading && tasks.length === 0 ? (
        <Notice title="Nothing planned today" body="Tasks you plan for today show up here." />
      ) : day.data ? (
        <TaskList tasks={tasks} projects={day.data.projects} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.one },
});
