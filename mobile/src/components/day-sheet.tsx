import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { CompanyMark } from '@/components/company-mark';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Card, Dot, ProgressBar } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, messageOf } from '@/lib/api';
import { fromKey } from '@/lib/dates';
import { type DayGroup, type DayMode, placeOf, pointsOn, type RowStatus, rowStatus } from '@/lib/day';
import { type PlaceInput, refreshWork } from '@/lib/query';
import { pickOf } from '@/lib/status';
import { POINT_LABEL, useChangeTask } from '@/lib/tasks';
import type { Day, Task } from '@/lib/types';

/** Others' work in a project on the day: "2 mine / 5 total". */
export type GroupTeam = { mine: number; total: number };

/** Where "+ Add a task in …" puts a task typed under a group. */
export function addPlaceOf(group: DayGroup, day: Day): PlaceInput | null {
  if (group.key.startsWith('project:')) return { projectId: group.key.slice(8) };
  if (group.place?.personal) return { personal: true };
  // A company's general work goes in its core project.
  if (group.key.startsWith('company:')) {
    const companyId = group.key.slice(8);
    const core = day.projects.find(
      (p) => p.companyId === companyId && !p.isPersonal && p.name.trim().toUpperCase() === 'CORE',
    );
    return core ? { projectId: core.id } : null;
  }
  return null;
}

/**
 * A day's tasks in groups, as the worklog page's sheet shows them: each
 * place with its tasks, "N mine / M total" when others work there too, and
 * a line at the end to add the next task in it.
 */
export function DaySheet({
  day,
  date,
  mode,
  groups,
  teams,
  onTeam,
}: {
  day: Day;
  date: string;
  mode: DayMode;
  groups: DayGroup[];
  teams?: Record<string, GroupTeam>;
  /** Opens who is working on what in a project. */
  onTeam?: (projectId: string) => void;
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
                  size={24}
                />
              )
            ) : null}
            <ThemedText type="smallBold" numberOfLines={1} style={styles.flex}>
              {g.title}
            </ThemedText>
            <GroupCount group={g} team={teams?.[g.key.slice(8)]} onTeam={onTeam} />
          </View>
          {g.tasks.map((task) => (
            <DayTaskRow
              key={task.id}
              task={task}
              day={day}
              date={date}
              quiet={g.quiet}
              showPlace={mode !== 'summary'}
            />
          ))}
          {addPlaceOf(g, day) ? <AddTaskLine place={addPlaceOf(g, day)!} name={g.title} date={date} /> : null}
        </Card>
      ))}
    </>
  );
}

/** The group's count, or "2 mine / 5 total" (a link) when others work there too. */
function GroupCount({
  group,
  team,
  onTeam,
}: {
  group: DayGroup;
  team?: GroupTeam;
  onTeam?: (projectId: string) => void;
}) {
  const theme = useTheme();
  if (!team || team.total <= team.mine || !group.key.startsWith('project:')) return null;
  return (
    <Pressable
      hitSlop={8}
      accessibilityRole="button"
      accessibilityHint="Shows who is working on what here"
      onPress={() => onTeam?.(group.key.slice(8))}
      style={({ pressed }) => [
        styles.team,
        { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.6 : 1 },
      ]}>
      <Icon name="people" size={13} color={theme.textSecondary} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.teamText}>
        <ThemedText type="smallBold" style={styles.teamText}>
          {team.mine} mine
        </ThemedText>{' '}
        / {team.total}
      </ThemedText>
      <Icon name="chevron" size={10} color={theme.textSecondary} />
    </Pressable>
  );
}

/**
 * "+ Add a task in PORTAL": a tap turns it into a line to type in; done adds
 * the task to the day and leaves the line open for the next one.
 */
function AddTaskLine({ place, name, date }: { place: PlaceInput; name: string; date: string }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const words = title.trim();
    if (!words) return setOpen(false);
    setBusy(true);
    try {
      await api('/api/me/day/tasks', { method: 'POST', body: { title: words, date, place } });
      setTitle('');
      refreshWork();
    } catch (e) {
      Alert.alert('Couldn’t add the task', messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  if (!open)
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.add, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}>
        <View style={styles.addIcon}>
          <Icon name="add" size={15} color={theme.textSecondary} />
        </View>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.flex}>
          Add a task in {name}
        </ThemedText>
      </Pressable>
    );
  return (
    <View style={[styles.add, { borderColor: theme.border }]}>
      <View style={styles.addIcon}>
        <View style={[styles.ring, { borderColor: theme.textSecondary }]} />
      </View>
      <TextInput
        value={title}
        onChangeText={setTitle}
        autoFocus
        editable={!busy}
        placeholder="What needs doing?"
        placeholderTextColor={theme.textSecondary}
        returnKeyType="done"
        submitBehavior="submit"
        onSubmitEditing={() => void add()}
        onBlur={() => !title.trim() && setOpen(false)}
        maxLength={200}
        style={[styles.input, { color: theme.text }]}
      />
    </View>
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

/** A task's mark: an open circle (with its status's dot while open), a tick, a cross. */
export function StatusMark({ status }: { status: RowStatus }) {
  const theme = useTheme();
  if (status === 'done') return <Icon name="checkCircle" size={22} color={theme.success} />;
  if (status === 'not_done' || status === 'failed') return <Icon name="xCircle" size={22} color={theme.danger} />;
  if (status === 'archived') return <Icon name="minusCircle" size={22} color={theme.textSecondary} />;
  const dot = status ? pickOf(status).color : null;
  return (
    <View style={[styles.ring, { borderColor: theme.textSecondary }]}>
      {dot ? <View style={[styles.inner, { backgroundColor: dot }]} /> : null}
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
            quiet && (done || status === 'archived' || status === 'not_done' || status === 'failed') && {
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
        <ThemedText type="small" themeColor="textSecondary" accessibilityLabel={`Planned for ${task.forDate}`}>
          {fromKey(task.forDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
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
  team: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
  },
  teamText: { fontSize: 13, lineHeight: 17 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
    minHeight: 42,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addIcon: { width: 22, alignItems: 'center' },
  input: { flex: 1, fontSize: 15, paddingVertical: Spacing.two },
});
