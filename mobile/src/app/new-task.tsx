import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { CompanyMark } from '@/components/company-mark';
import { useOnline } from '@/components/offline-banner';
import { ProjectPicker } from '@/components/project-picker';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Field, Screen, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, messageOf } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { addDays, todayKey } from '@/lib/dates';
import { projectName } from '@/lib/project-name';
import { type PlaceInput, queryClient, refreshWork } from '@/lib/query';
import type { ProjectRef, Task } from '@/lib/types';

type When = 'today' | 'tomorrow' | 'later';
type Kind = 'task' | 'goal' | 'idea';
type GoalKind = 'scheduled' | 'target';
type Period = 'day' | 'week' | 'month';

/**
 * Add a task, a goal or an idea. First where it goes (companies as tabs, their
 * projects, or Personal), then the words: a task for a day, a goal that
 * repeats ("3 a week") or is one number to reach ("1,000 subscribers"), or an
 * idea, which opens a new page in the project to write it down.
 */
export default function NewTaskSheet() {
  const theme = useTheme();
  // Words shared from another app (the Share screen).
  const params = useLocalSearchParams<{ title?: string }>();
  const online = useOnline();
  const { profile } = useAuth();
  const today = todayKey();
  // Null until picked; `auto` lets the portal place it from its words.
  const [place, setPlace] = useState<PlaceInput | 'auto' | null>(null);
  const [project, setProject] = useState<ProjectRef | null>(null);
  const [kind, setKind] = useState<Kind>('task');
  const [title, setTitle] = useState(params.title ?? '');
  const [when, setWhen] = useState<When>('today');
  const [goalKind, setGoalKind] = useState<GoalKind>('scheduled');
  const [count, setCount] = useState('1');
  const [period, setPeriod] = useState<Period>('week');
  const [forTeam, setForTeam] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!place)
    return (
      <View style={[styles.flex, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Where does it go?' }} />
        <ProjectPicker
          onPick={(picked, p) => {
            setPlace(picked);
            setProject(p);
            if (!p) setKind('task');
          }}
        />
        <Pressable
          onPress={() => {
            setPlace('auto');
            setProject(null);
            setKind('task');
          }}
          style={({ pressed }) => [styles.auto, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}>
          <ThemedText type="small" themeColor="textSecondary">
            Not sure? Let the portal place it from its words
          </ThemedText>
        </Pressable>
      </View>
    );

  const personal = place !== 'auto' && 'personal' in place;
  const number = Math.max(1, Math.floor(Number(count) || 0));
  const canGoal = !!project;

  const addTask = async () => {
    await api<{ task: Task }>('/api/me/day/tasks', {
      method: 'POST',
      body: {
        title: title.trim(),
        date: when === 'later' ? null : when === 'tomorrow' ? addDays(today, 1) : today,
        ...(place !== 'auto' && { place }),
      },
    });
    refreshWork();
  };

  const addGoal = async () => {
    if (!project) return;
    await api(`/api/projects/${project.id}/goals`, {
      method: 'POST',
      body: {
        goal: {
          title: title.trim(),
          kind: goalKind,
          target: number,
          period: goalKind === 'target' ? 'month' : period,
          assigneeIds: forTeam || !profile ? [] : [profile.id],
        },
      },
    });
    void queryClient.invalidateQueries({ queryKey: ['goals'] });
    void queryClient.invalidateQueries({ queryKey: ['project', project.id] });
    refreshWork();
  };

  const writeIdea = () => {
    if (!project) return;
    router.replace({
      pathname: '/page/[projectId]/[pageId]',
      params: { projectId: project.id, pageId: 'new', title: title.trim() },
    });
  };

  const save = async () => {
    if (kind === 'idea') return writeIdea();
    setBusy(true);
    try {
      await (kind === 'goal' ? addGoal() : addTask());
      router.back();
    } catch (e) {
      Alert.alert(kind === 'goal' ? 'Couldn’t add the goal' : 'Couldn’t add the task', messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  const ready =
    !!title.trim() && online && (kind === 'task' || (canGoal && (kind === 'idea' || number > 0)));

  return (
    <Screen edgeTop={false}>
      <Stack.Screen options={{ title: kind === 'goal' ? 'New goal' : kind === 'idea' ? 'New idea' : 'New task' }} />
      <Card style={styles.where}>
        {place === 'auto' ? (
          <View style={styles.flex}>
            <ThemedText type="smallBold">Placed from its words</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              The portal picks the project.
            </ThemedText>
          </View>
        ) : (
          <>
            <CompanyMark
              id={project?.id ?? 'personal'}
              name={project?.name ?? 'Personal'}
              color={project?.color}
              logo={project?.logo}
              personal={personal}
              size={36}
            />
            <View style={styles.flex}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {personal ? 'Personal' : projectName(project, project?.companyName) || 'Project'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {personal ? 'Only you see it' : (project?.companyName ?? 'Project')}
              </ThemedText>
            </View>
          </>
        )}
        <Button title="Change" kind="secondary" small onPress={() => setPlace(null)} />
      </Card>

      {canGoal ? (
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: 'task', label: 'Task' },
            { value: 'goal', label: 'Goal' },
            { value: 'idea', label: 'Idea' },
          ]}
        />
      ) : null}

      <Field
        value={title}
        onChangeText={setTitle}
        placeholder={
          kind === 'goal'
            ? 'What’s the goal? e.g. Videos posted'
            : kind === 'idea'
              ? 'Name the idea'
              : 'What needs doing?'
        }
        autoFocus
        maxLength={200}
        returnKeyType="done"
        onSubmitEditing={() => ready && void save()}
      />

      {kind === 'task' ? (
        <Segmented
          value={when}
          onChange={setWhen}
          options={[
            { value: 'today', label: 'Today' },
            { value: 'tomorrow', label: 'Tomorrow' },
            { value: 'later', label: 'Later' },
          ]}
        />
      ) : kind === 'idea' ? (
        <ThemedText type="small" themeColor="textSecondary">
          It becomes a page in {projectName(project, project?.companyName) || 'the project'}, under its pages.
          Write it next; the team sees it there and on the website.
        </ThemedText>
      ) : (
        <>
          <Segmented
            value={goalKind}
            onChange={setGoalKind}
            options={[
              { value: 'scheduled', label: 'Repeats' },
              { value: 'target', label: 'Target' },
            ]}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {goalKind === 'scheduled'
              ? 'A number every day, week or month. It makes its own tasks on the days.'
              : 'One number to reach, like 1,000 subscribers. Finished tasks and updates add up.'}
          </ThemedText>
          <View style={styles.row}>
            <ThemedText type="smallBold" style={styles.label}>
              {goalKind === 'scheduled' ? 'How many' : 'Target'}
            </ThemedText>
            <Field
              value={count}
              onChangeText={(v) => setCount(v.replace(/[^\d]/g, ''))}
              keyboardType="number-pad"
              maxLength={7}
              style={styles.flex}
            />
          </View>
          {goalKind === 'scheduled' ? (
            <>
              <Segmented
                value={period}
                onChange={setPeriod}
                options={[
                  { value: 'day', label: 'A day' },
                  { value: 'week', label: 'A week' },
                  { value: 'month', label: 'A month' },
                ]}
              />
              <Segmented
                value={forTeam ? 'team' : 'me'}
                onChange={(v) => setForTeam(v === 'team')}
                options={[
                  { value: 'me', label: 'Just me' },
                  { value: 'team', label: 'Whole team' },
                ]}
              />
            </>
          ) : null}
        </>
      )}

      <View style={styles.gap} />
      <Button
        title={kind === 'goal' ? 'Add goal' : kind === 'idea' ? 'Write the page' : 'Add task'}
        busy={busy}
        disabled={!ready}
        onPress={() => void save()}
      />
      {!online ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Adding needs a connection.
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  auto: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingBottom: Spacing.five,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  where: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  label: { width: 84 },
  gap: { height: Spacing.one },
  center: { textAlign: 'center' },
});
