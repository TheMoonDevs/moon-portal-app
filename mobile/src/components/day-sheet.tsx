import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { CompanyMark } from '@/components/company-mark';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Card, Dot, ProgressBar } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type DayGroup, type DayMode, placeOf, pointsOn, type RowStatus, rowStatus } from '@/lib/day';
import { POINT_LABEL, useChangeTask } from '@/lib/tasks';
import type { Day, Task } from '@/lib/types';

/** A day's tasks in groups, as the worklog page's sheet shows them. */
export function DaySheet({
  day,
  date,
  mode,
  groups,
}: {
  day: Day;
  date: string;
  mode: DayMode;
  groups: DayGroup[];
}) {
  const theme = useTheme();
  return (
    <>
      {groups.map((g) => (
        <Card key={g.key} style={styles.group}>
          <View style={styles.head}>
            {g.place ? (
              g.place.key === 'none' ? (
                <Dot color={theme.textSecondary} size={10} />
              ) : (
                <CompanyMark
                  id={g.place.key}
                  name={g.place.name}
                  color={g.place.color}
                  logo={g.place.logo}
                  personal={g.place.personal}
                  size={20}
                />
              )
            ) : null}
            <ThemedText type="label" themeColor="textSecondary" numberOfLines={1} style={styles.flex}>
              {g.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {g.tasks.length}
            </ThemedText>
          </View>
          {g.tasks.map((task) => (
            <DayTaskRow
              key={task.id}
              task={task}
              day={day}
              date={date}
              quiet={g.quiet}
              showPlace={mode !== 'projects'}
            />
          ))}
        </Card>
      ))}
    </>
  );
}

/** The Work view's bar: how much of the day is finished. */
export function WorkBar({ done, total }: { done: number; total: number }) {
  if (!total) return null;
  return (
    <View style={styles.bar}>
      <ThemedText type="small" themeColor="textSecondary">
        {done} of {total} finished
      </ThemedText>
      <ProgressBar percent={(done / total) * 100} />
    </View>
  );
}

const DOT: Record<string, string> = { doing: '#f59e0b', waiting: '#38bdf8', blocked: '#f43f5e' };

/** A task's mark: an open circle (with a dot while under way), a tick, a cross. */
function StatusMark({ status }: { status: RowStatus }) {
  const theme = useTheme();
  if (status === 'done') return <Icon name="checkCircle" size={22} color={theme.success} />;
  if (status === 'not_done') return <Icon name="xCircle" size={22} color={theme.danger} />;
  if (status === 'archived') return <Icon name="minusCircle" size={22} color={theme.textSecondary} />;
  return (
    <View style={[styles.ring, { borderColor: theme.textSecondary }]}>
      {status && DOT[status] ? <View style={[styles.inner, { backgroundColor: DOT[status] }]} /> : null}
    </View>
  );
}

function DayTaskRow({
  task,
  day,
  date,
  quiet,
  showPlace,
}: {
  task: Task;
  day: Day;
  date: string;
  quiet?: boolean;
  showPlace: boolean;
}) {
  const theme = useTheme();
  const change = useChangeTask();
  const status = rowStatus(task, day.points, date);
  const done = status === 'done';
  const points = pointsOn(task, day.points, date);
  const last = points.at(-1);
  const place = showPlace ? placeOf(task, day) : null;

  const toggle = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
    change.mutate({ taskId: task.id, status: done ? 'todo' : 'done' });
  };

  const detail = task.meeting
    ? `${task.meeting.time}${task.meeting.status !== 'CONFIRMED' ? ' · not confirmed yet' : ''}`
    : last
      ? last.text
      : status && status !== 'done'
        ? POINT_LABEL[status]
        : null;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
      style={({ pressed }) => [styles.row, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? 'Mark not done' : 'Mark done'}
        hitSlop={10}
        onPress={toggle}
        style={styles.mark}>
        <StatusMark status={status} />
      </Pressable>
      <View style={styles.text}>
        <ThemedText
          style={[
            status === 'doing' && styles.doing,
            quiet && (done || status === 'archived' || status === 'not_done') && {
              textDecorationLine: 'line-through',
              color: theme.textSecondary,
            },
          ]}>
          {task.meeting ? '📹 ' : ''}
          {task.title}
        </ThemedText>
        {detail ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {detail}
            {points.length > 1 ? `  · ${points.length} updates` : ''}
          </ThemedText>
        ) : null}
        {place && place.key !== 'none' ? (
          <View style={styles.place}>
            <Dot color={place.color} size={6} />
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {place.name}
            </ThemedText>
          </View>
        ) : null}
      </View>
      {task.forDate && task.forDate < date ? (
        <ThemedText type="small" themeColor="textSecondary">
          {Number(task.forDate.slice(8))}/{Number(task.forDate.slice(5, 7))}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: 0, paddingBottom: Spacing.one },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingBottom: Spacing.two },
  bar: { gap: Spacing.one },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + Spacing.one,
    paddingVertical: Spacing.two + Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  mark: { paddingTop: 1 },
  ring: {
    width: 20,
    height: 20,
    margin: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: { width: 8, height: 8, borderRadius: 4 },
  text: { flex: 1, gap: 2 },
  doing: { fontWeight: 600 },
  place: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});
