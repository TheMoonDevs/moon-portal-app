import { useQuery } from '@tanstack/react-query';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { CompanyChip } from '@/components/company-chip';
import { TaskList } from '@/components/task-list';
import { ThemedText } from '@/components/themed-text';
import { Button, Notice, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { useCompany } from '@/lib/company';
import type { MyTasks } from '@/lib/types';

/** Open tasks assigned to the person in the chosen company. */
export default function TasksScreen() {
  const { company } = useCompany();
  const query = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => api<MyTasks>('/api/me/tasks'),
  });
  const tasks = (query.data?.tasks ?? []).filter((t) => !company || t.companyId === company.id);

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }>
      <View style={styles.header}>
        <ThemedText type="title">Tasks</ThemedText>
        <ThemedText themeColor="textSecondary">
          {query.data ? `${tasks.length} open, assigned to you` : 'Loading…'}
        </ThemedText>
      </View>
      <CompanyChip />

      {query.error ? (
        <Notice title="Couldn’t load tasks" body={query.error.message}>
          <Button title="Try again" kind="secondary" onPress={() => void query.refetch()} />
        </Notice>
      ) : query.data && tasks.length === 0 ? (
        <Notice title="No open tasks" body="Tasks assigned to you in this company show up here." />
      ) : query.data ? (
        <TaskList tasks={tasks} projects={query.data.projects} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.one },
});
