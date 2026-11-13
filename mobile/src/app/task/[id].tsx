import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CompanyMark } from '@/components/company-mark';
import { Icon } from '@/components/icon';
import { MeetingCard } from '@/components/meeting-card';
import { ProjectPicker } from '@/components/project-picker';
import { StatusDot } from '@/components/status-dot';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, Field, IconButton, QueryState, Screen } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { addDays, clock, dayTitle, todayKey } from '@/lib/dates';
import { useProjectLabel } from '@/lib/project-name';
import { currentPick, pickOf, STATUS_PICKS, type StatusPick } from '@/lib/status';
import { POINT_LABEL, useChangeTask } from '@/lib/tasks';
import type { TaskDetail } from '@/lib/types';

/**
 * One task: its status (at the top, and within thumb's reach at the bottom
 * with Log work), its day and project, the goal it is part of, and the work
 * logged on it. Archiving sits apart and asks first.
 */
export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const change = useChangeTask();
  const label = useProjectLabel();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const [barHeight, setBarHeight] = useState(140);
  const query = useQuery({
    queryKey: ['task', id],
    queryFn: () => api<TaskDetail>(`/api/mobile/tasks/${id}`),
  });
  const data = query.data;
  const task = data?.task;
  const today = todayKey();
  const current = task ? currentPick(task) : null;
  const archived = current === 'archived';
  const goal = task?.goalId ? data?.project?.goals?.find((g) => g.id === task.goalId) : null;

  const setStatus = (status: StatusPick) => {
    if (!task || status === current) return;
    void Haptics.selectionAsync().catch(() => null);
    change.mutate({ taskId: task.id, status });
  };

  const archive = () => {
    if (!task) return;
    Alert.alert('Archive this task?', 'It leaves your day and your lists. Its history is kept.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: () => {
          change.mutate({ taskId: task.id, status: 'archived' });
          router.back();
        },
      },
    ]);
  };

  const nameOf = (userId: string) =>
    userId === profile?.id ? 'You' : (data?.people.find((p) => p.id === userId)?.name ?? 'Someone');

  // Newest first, grouped by day.
  const byDay = new Map<string, NonNullable<typeof data>['points']>();
  for (const p of [...(data?.points ?? [])].reverse())
    byDay.set(p.date, [...(byDay.get(p.date) ?? []), p]);

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Screen
        edgeTop={false}
        contentContainerStyle={{ paddingBottom: (task && !archived ? barHeight : 0) + Spacing.four }}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
        }>
        <Stack.Screen
          options={{
            title: goal ? 'Goal' : 'Task',
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
        {task && current ? (
          <>
            {goal ? (
              <View style={[styles.goal, { backgroundColor: theme.backgroundSelected }]}>
                <Icon name="target" size={18} color={theme.text} />
                <View style={styles.flex}>
                  <ThemedText type="label">Goal</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                    {goal.kind === 'target' ? 'Counts toward a target: ' : 'A repeating goal: '}
                    {goal.title}
                  </ThemedText>
                </View>
                {data?.project ? (
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      router.push({
                        pathname: '/goal/[projectId]/[goalId]',
                        params: { projectId: data.project!.id, goalId: goal.id },
                      })
                    }>
                    <ThemedText type="smallBold">Open</ThemedText>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

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
              <ThemedText type="subtitle">{task.title}</ThemedText>
            )}

            {/* Its status, and a tap to change it. */}
            {archived ? (
              <View style={styles.row}>
                <Icon name="trash" size={16} color={theme.textSecondary} />
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.flex}>
                  Archived
                </ThemedText>
                <Button title="Open again" kind="secondary" small onPress={() => change.mutate({ taskId: task.id, status: 'todo' })} />
              </View>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Status: ${pickOf(current).label}. Change it`}
                  onPress={() => setStatusOpen((v) => !v)}
                  style={({ pressed }) => [
                    styles.statusPill,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
                  ]}>
                  <StatusDot status={current} size={12} />
                  <ThemedText type="smallBold">{pickOf(current).label}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    · {pickOf(current).hint}
                  </ThemedText>
                  <Icon name="chevronDown" size={12} color={theme.textSecondary} />
                </Pressable>
                {statusOpen ? (
                  <StatusPicker
                    value={current}
                    wide
                    onPick={(s) => {
                      setStatus(s);
                      setStatusOpen(false);
                    }}
                  />
                ) : null}
              </>
            )}

            {task.description ? <ThemedText themeColor="textSecondary">{task.description}</ThemedText> : null}
            {task.meeting ? <MeetingCard meeting={task.meeting} title={task.title} /> : null}

            <Card>
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
                {task.forDate && task.forDate !== today && task.forDate !== addDays(today, 1) ? (
                  <Chip label={dayTitle(task.forDate, today)} selected />
                ) : null}
              </View>
              <ThemedText type="label" themeColor="textSecondary">
                Project
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityHint="Move this task to another project"
                onPress={() => setMoving(true)}
                style={({ pressed }) => [
                  styles.project,
                  { borderColor: theme.border, backgroundColor: theme.background, opacity: pressed ? 0.7 : 1 },
                ]}>
                {data?.project ? (
                  <CompanyMark
                    id={data.project.id}
                    name={label(data.project).name}
                    color={label(data.project).color}
                    logo={label(data.project).logo}
                    size={30}
                  />
                ) : (
                  <View style={[styles.noProject, { borderColor: theme.textSecondary }]} />
                )}
                <ThemedText type="smallBold" style={styles.flex} numberOfLines={1}>
                  {data?.project ? label(data.project).name : 'Not in a project yet'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {data?.project ? 'Change' : 'Pick one'}
                </ThemedText>
                <Icon name="forward" size={12} color={theme.textSecondary} />
              </Pressable>
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
                          <View style={styles.pointStatus}>
                            {p.status !== 'not_done' ? <StatusDot status={p.status} size={8} /> : null}
                            <ThemedText
                              type="smallBold"
                              themeColor={p.status === 'done' ? 'success' : 'textSecondary'}>
                              {POINT_LABEL[p.status] ?? p.status}
                            </ThemedText>
                          </View>
                        ) : null}
                      </View>
                      {p.text ? <ThemedText>{p.text}</ThemedText> : null}
                    </View>
                  ))}
                </Card>
              ))
            )}

            {!archived ? (
              <>
                <ThemedText type="label" themeColor="textSecondary">
                  Archive
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={archive}
                  style={({ pressed }) => [
                    styles.archive,
                    { borderColor: theme.border, backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
                  ]}>
                  <Icon name="trash" size={18} color={theme.danger} />
                  <View style={styles.flex}>
                    <ThemedText type="smallBold" themeColor="danger">
                      Archive this task
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Takes it off your day and lists. You’ll be asked first.
                    </ThemedText>
                  </View>
                </Pressable>
              </>
            ) : null}
          </>
        ) : null}
      </Screen>

      {task && current && !archived ? (
        <View
          onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
          style={[
            styles.bar,
            { backgroundColor: theme.background, borderColor: theme.border, paddingBottom: insets.bottom + Spacing.two },
          ]}>
          {/* As wide as the page above it (an iPad). */}
          <View style={styles.barInner}>
            <StatusPicker value={current} onPick={setStatus} />
            <Button
              title="Log work"
              icon={<Icon name="pencil" size={16} color={theme.onAccent} />}
              onPress={() => router.push({ pathname: '/log', params: { taskId: task.id } })}
            />
          </View>
        </View>
      ) : null}

      <Modal
        visible={moving}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setMoving(false)}>
        <View style={[styles.flex, { backgroundColor: theme.background }]}>
          <View style={styles.sheetHead}>
            <ThemedText type="subtitle" style={styles.flex}>
              Move to
            </ThemedText>
            <IconButton name="close" label="Close" onPress={() => setMoving(false)} />
          </View>
          <ProjectPicker
            selected={task?.projectId}
            onPick={(place) => {
              if (task) change.mutate({ taskId: task.id, place });
              setMoving(false);
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

/** The six statuses as coloured dots with their names, in order. */
function StatusPicker({
  value,
  onPick,
  wide,
}: {
  value: StatusPick;
  onPick: (status: StatusPick) => void;
  /** Roomier, with what each means, for the top. */
  wide?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.picker, wide && { backgroundColor: theme.backgroundElement, borderColor: theme.border }, wide && styles.pickerWide]}>
      {STATUS_PICKS.map((s) => {
        const on = s.value === value;
        return (
          <Pressable
            key={s.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${s.label}: ${s.hint}`}
            onPress={() => onPick(s.value)}
            style={({ pressed }) => [
              styles.pick,
              on && { backgroundColor: theme.backgroundSelected, borderColor: theme.text },
              { opacity: pressed ? 0.6 : 1 },
            ]}>
            <StatusDot status={s.value} size={16} />
            <ThemedText type={on ? 'smallBold' : 'small'} style={styles.pickLabel} numberOfLines={1}>
              {s.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  goal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.two,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  project: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.two,
  },
  noProject: { width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, borderStyle: 'dashed' },
  point: { gap: Spacing.half, paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  pointStatus: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  archive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  barInner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.two },
  picker: { flexDirection: 'row', gap: Spacing.one },
  pickerWide: {
    padding: Spacing.one,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pick: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.two,
    borderRadius: Radius.small,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pickLabel: { fontSize: 12, lineHeight: 15 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', padding: Spacing.three, paddingBottom: 0 },
});
