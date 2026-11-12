import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { OfflineBanner } from '@/components/offline-banner';
import { TaskList } from '@/components/task-list';
import { ThemedText } from '@/components/themed-text';
import { IconButton, Notice, QueryState, Screen, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { todayKey } from '@/lib/dates';
import type { MyTasks, Task } from '@/lib/types';

type View_ = 'open' | 'waiting' | 'archived';

/**
 * Every open task of theirs in every company, by when it is for; and the
 * ones put away.
 */
export default function TasksScreen() {
  const [view, setView] = useState<View_>('open');
  const query = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api<MyTasks>('/api/me/tasks'),
  });
  const today = query.data?.today ?? todayKey();
  const open = query.data?.tasks ?? [];
  const projects = query.data?.projects ?? [];
  const groups: { title: string; tasks: Task[] }[] =
    view === 'archived'
      ? [{ title: 'Archived in the last 60 days', tasks: query.data?.archived ?? [] }]
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
      edgeTop={false}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }>
      <Stack.Screen
        options={{
          headerRight: () => (
            <IconButton name="add" label="Add a task" onPress={() => router.push('/new-task')} />
          ),
        }}
      />
      <OfflineBanner />
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
          body={view === 'open' ? 'No open tasks anywhere.' : undefined}
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
  group: { gap: Spacing.two },
});
