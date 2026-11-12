import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { CompanyChip } from '@/components/company-chip';
import { OfflineBanner } from '@/components/offline-banner';
import { TaskList } from '@/components/task-list';
import { ThemedText } from '@/components/themed-text';
import { Button, Notice, QueryState, Screen, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { useCompany } from '@/lib/company';
import { todayKey } from '@/lib/dates';
import type { MyTasks, Task } from '@/lib/types';

type View_ = 'open' | 'waiting' | 'archived';

/** Every open task of theirs, by when it is for; and the ones put away. */
export default function TasksScreen() {
  const { company } = useCompany();
  const [view, setView] = useState<View_>('open');
  const query = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api<MyTasks>('/api/me/tasks'),
  });
  const today = query.data?.today ?? todayKey();
  const inCompany = (t: Task) =>
    !company || t.companyId === company.id || (!t.companyId && !!company.isPersonal);

  const open = (query.data?.tasks ?? []).filter(inCompany);
  const projects = query.data?.projects ?? [];
  const groups: { title: string; tasks: Task[] }[] =
    view === 'archived'
      ? [{ title: 'Archived in the last 60 days', tasks: (query.data?.archived ?? []).filter(inCompany) }]
      : view === 'waiting'
        ? [
            { title: 'Blocked', tasks: open.filter((t) => t.flag === 'blocked') },
            { title: 'Waiting', tasks: open.filter((t) => t.flag === 'waiting') },
          ]
        : [
            { title: 'From before', tasks: open.filter((t) => !t.flag && t.forDate && t.forDate < today) },
            { title: 'Today', tasks: open.filter((t) => !t.flag && t.forDate === today) },
            { title: 'Coming up', tasks: open.filter((t) => !t.flag && t.forDate && t.forDate > today) },
            { title: 'No day yet', tasks: open.filter((t) => !t.flag && !t.forDate) },
          ];
  const shown = groups.filter((g) => g.tasks.length);

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }>
      <View style={styles.top}>
        <ThemedText type="title" style={styles.flex}>
          Tasks
        </ThemedText>
        <Button title="Add" small onPress={() => router.push('/new-task')} />
      </View>
      <OfflineBanner />
      <CompanyChip />
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'open', label: `Open${open.length ? ` ${open.filter((t) => !t.flag).length}` : ''}` },
          { value: 'waiting', label: 'Waiting' },
          { value: 'archived', label: 'Archived' },
        ]}
      />
      <QueryState
        loading={query.isPending}
        error={query.data ? null : query.error}
        onRetry={() => void query.refetch()}
        what="your tasks"
      />
      {query.data && !shown.length ? (
        <Notice
          title={view === 'open' ? 'All clear' : 'Nothing here'}
          body={view === 'open' ? 'No open tasks in this company.' : undefined}
        />
      ) : null}
      {shown.map((g) => (
        <View key={g.title} style={styles.group}>
          <ThemedText type="label" themeColor="textSecondary">
            {g.title} · {g.tasks.length}
          </ThemedText>
          <TaskList tasks={g.tasks} projects={projects} showDay={g.title !== 'Today'} />
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  group: { gap: Spacing.two },
});
