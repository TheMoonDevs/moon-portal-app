import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { useOnline } from '@/components/offline-banner';
import { ThemedText } from '@/components/themed-text';
import { Button, Chip, Dot, Field, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, messageOf, withQuery } from '@/lib/api';
import { todayKey } from '@/lib/dates';
import { projectName } from '@/lib/project-name';
import { refreshWork } from '@/lib/query';
import { isOpen, POINT_STATUSES, statusLabel, useLogPoint } from '@/lib/tasks';
import type { Day, MyTasks, PointStatus, ProjectRef, Task } from '@/lib/types';

/**
 * Log work: pick a task (today's first), say what happened and, if it
 * changed, its status. Works offline: the update waits on the phone and goes
 * out when the network is back. Words that match no task make a new one.
 */
export default function LogWorkSheet() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ taskId?: string }>();
  const online = useOnline();
  const date = todayKey();
  const day = useQuery({
    queryKey: ['day', date],
    queryFn: () => api<Day>(withQuery('/api/me/day', { date })),
  });
  const mine = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api<MyTasks>('/api/me/tasks'),
  });
  const log = useLogPoint();

  const [taskId, setTaskId] = useState<string | null>(params.taskId ?? null);
  const [search, setSearch] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState<PointStatus | null>(null);
  const [creating, setCreating] = useState(false);

  const projects: ProjectRef[] = useMemo(
    () => [...(day.data?.projects ?? []), ...(mine.data?.projects ?? [])],
    [day.data, mine.data],
  );
  // Today's tasks first, then every other open task of theirs.
  const choices: Task[] = useMemo(() => {
    const seen = new Set<string>();
    const list: Task[] = [];
    for (const t of [...(day.data?.tasks ?? []), ...(mine.data?.tasks ?? [])]) {
      if (seen.has(t.id) || t.meeting) continue;
      seen.add(t.id);
      list.push(t);
    }
    return list;
  }, [day.data, mine.data]);
  const chosen = choices.find((t) => t.id === taskId) ?? null;
  const words = search.trim().toLowerCase();
  const shown = choices
    .filter((t) => isOpen(t) || t.id === taskId || t.status === 'DONE')
    .filter((t) => !words || t.title.toLowerCase().includes(words))
    .slice(0, words ? 20 : 8);
  const projectOf = (t: Task) => projects.find((p) => p.id === t.projectId);

  const canSave = !!chosen && (!!text.trim() || !!status);

  const save = () => {
    if (!chosen) return;
    log.mutate({ taskId: chosen.id, text: text.trim(), status, date });
    if (!online)
      Alert.alert('Saved on your phone', 'It will be logged as soon as you’re back online.');
    router.back();
  };

  /** No task matches: make one from the words, then log on it. */
  const createAndLog = async () => {
    const title = search.trim();
    if (!title) return;
    setCreating(true);
    try {
      await api<{ task: Task }>('/api/me/day/tasks', {
        method: 'POST',
        body: { date, title, status: status ?? 'doing' },
      });
      refreshWork();
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t add the task', messageOf(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Screen edgeTop={false}>
      <ThemedText type="label" themeColor="textSecondary">
        Task
      </ThemedText>
      {chosen ? (
        <Pressable
          onPress={() => setTaskId(null)}
          style={[styles.chosen, { borderColor: theme.accent, backgroundColor: theme.backgroundElement }]}>
          <Dot color={projectOf(chosen)?.color} />
          <View style={styles.flex}>
            <ThemedText>{chosen.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {projectName(projectOf(chosen), projectOf(chosen)?.companyName) || 'No project'} · {statusLabel(chosen)} · tap to change
            </ThemedText>
          </View>
        </Pressable>
      ) : (
        <>
          <Field
            value={search}
            onChangeText={setSearch}
            placeholder="Search your tasks, or type a new one"
            returnKeyType="search"
          />
          <View style={styles.list}>
            {shown.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setTaskId(t.id)}
                style={({ pressed }) => [
                  styles.choice,
                  { borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
                ]}>
                <Dot color={projectOf(t)?.color} />
                <View style={styles.flex}>
                  <ThemedText numberOfLines={2}>{t.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {projectName(projectOf(t), projectOf(t)?.companyName) || 'No project'} · {statusLabel(t)}
                  </ThemedText>
                </View>
                <Icon name="chevron" size={14} color={theme.textSecondary} />
              </Pressable>
            ))}
            {!shown.length && !words ? (
              <ThemedText themeColor="textSecondary">
                {day.isPending || mine.isPending ? 'Loading your tasks…' : 'No open tasks yet.'}
              </ThemedText>
            ) : null}
          </View>
          {words ? (
            <Button
              title={`Add “${search.trim()}” as a task for today`}
              kind="secondary"
              busy={creating}
              disabled={!online}
              onPress={() => void createAndLog()}
            />
          ) : null}
        </>
      )}

      <ThemedText type="label" themeColor="textSecondary">
        What happened
      </ThemedText>
      <Field
        value={text}
        onChangeText={setText}
        placeholder="e.g. Finished the first draft"
        multiline
        style={styles.note}
        maxLength={2000}
      />

      <ThemedText type="label" themeColor="textSecondary">
        Status (optional)
      </ThemedText>
      <View style={styles.chips}>
        {POINT_STATUSES.map((s) => (
          <Chip
            key={s.value}
            label={s.label}
            selected={status === s.value}
            onPress={() => setStatus(status === s.value ? null : s.value)}
          />
        ))}
      </View>

      <Button title={online ? 'Log it' : 'Save for later'} disabled={!canSave} onPress={save} />
      {!chosen ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Pick a task first.
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chosen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
  list: { gap: 0 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
    paddingVertical: Spacing.two + Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  note: { minHeight: 96, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  center: { textAlign: 'center' },
});
