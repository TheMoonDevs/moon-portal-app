import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { MonthGrid } from '@/components/month-grid';
import { ThemedText } from '@/components/themed-text';
import { Avatar, Button, Card, Chip, Dot, Field, ProgressBar, QueryState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, messageOf } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dayTitle, monthOf, todayKey } from '@/lib/dates';
import { goalLine, PERIOD_EACH, useGoals } from '@/lib/goals';
import { queryClient, refreshWork } from '@/lib/query';
import type { GoalsCalendar } from '@/lib/types';

type GoalTask = GoalsCalendar['tasks'][number];

const dayOfTask = (t: GoalTask) =>
  t.forDate ?? (t.completedAt ? todayKey(new Date(t.completedAt)) : null);

/** One goal: its progress, its days this month (tick them), and who helped. */
export default function GoalScreen() {
  const { projectId, goalId } = useLocalSearchParams<{ projectId: string; goalId: string }>();
  const theme = useTheme();
  const { profile } = useAuth();
  const today = todayKey();
  const [month, setMonth] = useState(monthOf(today));
  const [amount, setAmount] = useState('');
  const [partId, setPartId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const query = useGoals(month);
  const data = query.data;
  const goal = data?.goals.find((g) => g.id === goalId && g.projectId === projectId);
  const project = data?.projects.find((p) => p.id === projectId);
  const tasks = (data?.tasks ?? []).filter((t) => t.goalId === goalId && t.projectId === projectId);
  const canUpdate = !!project?.canUpdate;
  const scheduled = goal?.kind !== 'target';
  const parts = goal?.progress.parts ?? [];

  const onDay = (day: string) => tasks.filter((t) => dayOfTask(t) === day);
  const state = (day: string): 'done' | 'missed' | 'open' | null => {
    const list = onDay(day);
    if (!list.length) return null;
    if (list.some((t) => t.status === 'DONE')) return 'done';
    if (list.some((t) => t.goalMissed) || day < today) return 'missed';
    return 'open';
  };

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['goals'] });
    void queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    refreshWork();
  };

  const tick = (day: string) => {
    if (!canUpdate || !goal || day > today) return;
    const done = state(day) !== 'done';
    Alert.alert(
      done ? `Tick ${dayTitle(day, today)} done?` : `Untick ${dayTitle(day, today)}?`,
      done ? `Counts toward “${goal.title}”.` : 'Its task goes back to open.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: done ? 'Tick done' : 'Untick',
          onPress: async () => {
            try {
              await api(`/api/projects/${projectId}/goals/${goalId}/tick`, {
                method: 'POST',
                body: { day, done },
              });
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              refresh();
            } catch (e) {
              Alert.alert('Couldn’t update the goal', messageOf(e));
            }
          },
        },
      ],
    );
  };

  const addProgress = async () => {
    const add = Number(amount.replace(/,/g, ''));
    if (!Number.isFinite(add) || !add) return;
    setBusy(true);
    try {
      await api(`/api/projects/${projectId}/goals/progress`, {
        method: 'POST',
        body: { goalId, add, ...(parts.length && { partId: partId ?? parts[0]?.id }) },
      });
      setAmount('');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refresh();
    } catch (e) {
      Alert.alert('Couldn’t add progress', messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  const nameOf = (userId: string) =>
    userId === profile?.id ? 'You' : (data?.users.find((u) => u.id === userId)?.name ?? 'Someone');
  const userOf = (userId: string) => data?.users.find((u) => u.id === userId);

  return (
    <Screen
      edgeTop={false}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }>
      <Stack.Screen options={{ title: goal?.title ?? 'Goal' }} />
      <QueryState
        loading={query.isPending}
        error={query.data ? null : query.error}
        onRetry={() => void query.refetch()}
        what="this goal"
      />
      {data && !goal ? (
        <ThemedText themeColor="textSecondary">This goal is gone, or you can’t see its project.</ThemedText>
      ) : null}
      {goal ? (
        <>
          <View style={styles.head}>
            <ThemedText type="subtitle">{goal.title}</ThemedText>
            <View style={styles.row}>
              <Dot color={project?.color} />
              <ThemedText type="small" themeColor="textSecondary">
                {project?.name} ·{' '}
                {scheduled ? `${goal.target} ${PERIOD_EACH[goal.period] ?? ''}` : `Target ${goal.target.toLocaleString()}`}
              </ThemedText>
            </View>
          </View>

          <Card>
            <View style={styles.row}>
              <ThemedText type="smallBold" style={styles.flex}>
                {goalLine(goal, goal.progress)}
              </ThemedText>
              <ThemedText type="smallBold">{Math.round(goal.progress.percent)}%</ThemedText>
            </View>
            <ProgressBar percent={goal.progress.percent} color={project?.color} />
            {parts.map((p) => (
              <View key={p.id} style={styles.part}>
                <ThemedText type="small" themeColor="textSecondary">
                  {p.label}: {p.done.toLocaleString()} of {p.target.toLocaleString()}
                </ThemedText>
                <ProgressBar percent={p.target ? (p.done / p.target) * 100 : 0} color={project?.color} />
              </View>
            ))}
          </Card>

          {scheduled ? (
            <Card>
              <MonthGrid
                month={month}
                onMonth={setMonth}
                canGoForward={month < monthOf(today)}
                onDay={canUpdate ? tick : undefined}
                mark={(day) => {
                  const s = state(day);
                  if (s === 'done') return <Icon name="check" size={10} color={theme.success} />;
                  if (s === 'missed') return <Icon name="close" size={10} color={theme.danger} />;
                  if (s === 'open') return <Dot size={5} />;
                  return null;
                }}
              />
              <ThemedText type="small" themeColor="textSecondary">
                {canUpdate
                  ? 'Tap a day to tick it done, or to untick it.'
                  : 'Ticks show the days its tasks were done.'}
              </ThemedText>
            </Card>
          ) : canUpdate ? (
            <Card>
              <ThemedText type="smallBold">Add progress</ThemedText>
              {parts.length ? (
                <View style={styles.chips}>
                  {parts.map((p) => (
                    <Chip
                      key={p.id}
                      label={p.label}
                      selected={(partId ?? parts[0]?.id) === p.id}
                      onPress={() => setPartId(p.id)}
                    />
                  ))}
                </View>
              ) : null}
              <View style={styles.row}>
                <Field
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="How many? (negative takes back)"
                  keyboardType="numbers-and-punctuation"
                  style={styles.flex}
                />
                <Button title="Add" busy={busy} disabled={!Number(amount.replace(/,/g, ''))} onPress={() => void addProgress()} />
              </View>
            </Card>
          ) : null}

          {goal.progress.contributors.length ? (
            <View style={styles.group}>
              <ThemedText type="label" themeColor="textSecondary">
                Who did it
              </ThemedText>
              {[...goal.progress.contributors]
                .sort((a, b) => b.done - a.done)
                .map((c) => (
                  <View key={c.userId} style={styles.row}>
                    <Avatar uri={userOf(c.userId)?.avatar} name={nameOf(c.userId)} size={28} />
                    <ThemedText style={styles.flex}>{nameOf(c.userId)}</ThemedText>
                    <ThemedText type="smallBold">{c.done}</ThemedText>
                  </View>
                ))}
            </View>
          ) : null}

          {tasks.length ? (
            <View style={styles.group}>
              <ThemedText type="label" themeColor="textSecondary">
                Its tasks this month
              </ThemedText>
              {[...tasks]
                .sort((a, b) => (dayOfTask(b) ?? '').localeCompare(dayOfTask(a) ?? ''))
                .map((t) => {
                  const day = dayOfTask(t);
                  const s = day ? state(day) : null;
                  return (
                    <View key={t.id} style={styles.row}>
                      <Icon
                        name={t.status === 'DONE' ? 'checkCircle' : 'circle'}
                        size={18}
                        color={t.status === 'DONE' ? theme.success : s === 'missed' ? theme.danger : theme.textSecondary}
                      />
                      <View style={styles.flex}>
                        <ThemedText numberOfLines={1}>{t.title}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {day ? dayTitle(day, today) : 'No day'}
                          {t.completedByIds?.length ? ` · ${t.completedByIds.map(nameOf).join(', ')}` : ''}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })}
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  part: { gap: Spacing.one },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  group: { gap: Spacing.two },
});
