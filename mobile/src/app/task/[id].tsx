import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { MeetingCard } from '@/components/meeting-card';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, Dot, Field, IconButton, QueryState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { addDays, clock, dayTitle, todayKey } from '@/lib/dates';
import { POINT_LABEL, statusLabel, useChangeTask } from '@/lib/tasks';
import type { TaskDetail, TaskMove } from '@/lib/types';

const MOVES: { value: TaskMove; label: string }[] = [
  { value: 'doing', label: 'Doing' },
  { value: 'done', label: 'Done' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'todo', label: 'To do' },
  { value: 'archived', label: 'Archive' },
];

/** One task: its status, day, meeting and the work logged on it. */
export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { profile } = useAuth();
  const change = useChangeTask();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const query = useQuery({
    queryKey: ['task', id],
    queryFn: () => api<TaskDetail>(`/api/mobile/tasks/${id}`),
  });
  const data = query.data;
  const task = data?.task;
  const today = todayKey();

  const current: TaskMove | null = !task
    ? null
    : task.status === 'DONE'
      ? 'done'
      : task.status === 'ARCHIVED'
        ? 'archived'
        : task.flag
          ? task.flag
          : task.status === 'IN_PROGRESS' || task.status === 'IN_REVIEW'
            ? 'doing'
            : 'todo';

  const nameOf = (userId: string) =>
    userId === profile?.id ? 'You' : (data?.people.find((p) => p.id === userId)?.name ?? 'Someone');

  // Newest first, grouped by day.
  const byDay = new Map<string, NonNullable<typeof data>['points']>();
  for (const p of [...(data?.points ?? [])].reverse())
    byDay.set(p.date, [...(byDay.get(p.date) ?? []), p]);

  return (
    <Screen
      edgeTop={false}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }>
      <Stack.Screen
        options={{
          headerRight: () =>
            task ? (
              <IconButton
                name="pencil"
                label="Rename"
                onPress={() => {
                  setTitle(task.title);
                  setEditing(true);
                }}
              />
            ) : null,
        }}
      />
      <QueryState
        loading={query.isPending}
        error={query.data ? null : query.error}
        onRetry={() => void query.refetch()}
        what="this task"
      />
      {task ? (
        <>
          {editing ? (
            <Card>
              <Field value={title} onChangeText={setTitle} autoFocus maxLength={200} />
              <View style={styles.row}>
                <Button title="Cancel" kind="secondary" small onPress={() => setEditing(false)} style={styles.flex} />
                <Button
                  title="Save"
                  small
                  disabled={!title.trim()}
                  onPress={() => {
                    change.mutate({ taskId: task.id, title: title.trim() });
                    setEditing(false);
                  }}
                  style={styles.flex}
                />
              </View>
            </Card>
          ) : (
            <View style={styles.head}>
              <ThemedText type="subtitle">{task.title}</ThemedText>
              <View style={styles.row}>
                <Dot color={data?.project?.color} />
                <ThemedText type="small" themeColor="textSecondary">
                  {data?.project?.name ?? 'No project'} · {statusLabel(task)}
                  {task.forDate ? ` · for ${dayTitle(task.forDate, today)}` : ''}
                </ThemedText>
              </View>
              {task.description ? <ThemedText themeColor="textSecondary">{task.description}</ThemedText> : null}
            </View>
          )}

          {task.meeting ? <MeetingCard meeting={task.meeting} title={task.title} /> : null}

          <Button
            title="Log work on this"
            onPress={() => router.push({ pathname: '/log', params: { taskId: task.id } })}
          />

          <Card>
            <ThemedText type="label" themeColor="textSecondary">
              Status
            </ThemedText>
            <View style={styles.chips}>
              {MOVES.map((m) => (
                <Chip
                  key={m.value}
                  label={m.label}
                  selected={current === m.value}
                  onPress={() => change.mutate({ taskId: task.id, status: m.value })}
                />
              ))}
            </View>
            <ThemedText type="label" themeColor="textSecondary">
              Day
            </ThemedText>
            <View style={styles.chips}>
              <Chip
                label="Today"
                selected={task.forDate === today}
                onPress={() => change.mutate({ taskId: task.id, forDate: today })}
              />
              <Chip
                label="Tomorrow"
                selected={task.forDate === addDays(today, 1)}
                onPress={() => change.mutate({ taskId: task.id, forDate: addDays(today, 1) })}
              />
              <Chip
                label="Later"
                selected={!task.forDate}
                onPress={() => change.mutate({ taskId: task.id, forDate: null })}
              />
            </View>
          </Card>

          <ThemedText type="label" themeColor="textSecondary">
            History
          </ThemedText>
          {byDay.size === 0 ? (
            <ThemedText themeColor="textSecondary">Nothing logged yet.</ThemedText>
          ) : (
            Array.from(byDay.entries()).map(([date, points]) => (
              <Card key={date}>
                <ThemedText type="smallBold">{dayTitle(date, today)}</ThemedText>
                {points.map((p) => (
                  <View key={p.id} style={[styles.point, { borderColor: theme.border }]}>
                    <View style={styles.row}>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                        {p.by !== 'person' ? `${p.by} for ` : ''}
                        {nameOf(p.userId)} · {clock(p.at)}
                      </ThemedText>
                      {p.status ? (
                        <ThemedText type="smallBold" themeColor={p.status === 'done' ? 'success' : 'textSecondary'}>
                          {POINT_LABEL[p.status] ?? p.status}
                        </ThemedText>
                      ) : null}
                    </View>
                    {p.text ? <ThemedText>{p.text}</ThemedText> : null}
                  </View>
                ))}
              </Card>
            ))
          )}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  point: { gap: Spacing.half, paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
});
