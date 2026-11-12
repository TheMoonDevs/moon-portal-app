import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { TaskRow } from '@/components/task-list';
import { ThemedText } from '@/components/themed-text';
import {
  Avatar,
  Button,
  Card,
  Dot,
  PressableCard,
  ProgressBar,
  QueryState,
  Row,
  Screen,
  Segmented,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { api, messageOf } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { goalLine } from '@/lib/goals';
import { statusLabel } from '@/lib/tasks';
import type { ChatConversation, ProjectDetail, ProjectPage, Task } from '@/lib/types';

type TaskView = 'mine' | 'open' | 'done';

/** A project: progress, goals, team, pages and tasks. */
export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const me = profile?.id ?? '';
  const [view, setView] = useState<TaskView>('mine');
  const [opening, setOpening] = useState(false);
  const query = useQuery({
    queryKey: ['project', id],
    queryFn: () => api<ProjectDetail>(`/api/projects/${id}`),
  });
  const pages = useQuery({
    queryKey: ['project', id, 'pages'],
    queryFn: () =>
      api<{ objective: ProjectPage | null; pages: ProjectPage[] }>(`/api/projects/${id}/pages`),
  });
  const project = query.data?.project;
  const people = query.data?.people ?? [];
  const onTeam = !!project && (project.leadIds.includes(me) || project.memberIds.includes(me));

  const isMine = (t: Task) => t.ownerId === me || (t.assigneeIds ?? []).includes(me);
  const live = (query.data?.tasks ?? []).filter((t) => t.status !== 'ARCHIVED' && t.status !== 'IGNORED');
  const lists: Record<TaskView, Task[]> = {
    mine: live.filter((t) => isMine(t) && t.status !== 'DONE'),
    open: live.filter((t) => t.status !== 'DONE'),
    done: live
      .filter((t) => t.status === 'DONE')
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
      .slice(0, 30),
  };
  const nameOf = (userId?: string | null) =>
    userId === me ? 'You' : (people.find((p) => p.id === userId)?.name ?? null);

  const openChat = async () => {
    setOpening(true);
    try {
      const res = await api<{ conversation: ChatConversation }>('/api/chat/projects', {
        method: 'POST',
        body: { projectId: id },
      });
      router.push({ pathname: '/chat/[id]', params: { id: res.conversation.id } });
    } catch (e) {
      Alert.alert('Couldn’t open the project chat', messageOf(e));
    } finally {
      setOpening(false);
    }
  };

  const topPages = (pages.data?.pages ?? []).filter((p) => !p.parentId);
  const childCount = (pageId: string) => (pages.data?.pages ?? []).filter((p) => p.parentId === pageId).length;

  return (
    <Screen
      edgeTop={false}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => {
            void query.refetch();
            void pages.refetch();
          }}
        />
      }>
      <Stack.Screen options={{ title: project?.name ?? 'Project' }} />
      <QueryState
        loading={query.isPending}
        error={query.data ? null : query.error}
        onRetry={() => void query.refetch()}
        what="this project"
      />
      {project ? (
        <>
          <View style={styles.head}>
            <View style={styles.row}>
              <Dot color={project.color} size={12} />
              <ThemedText type="subtitle" style={styles.flex}>
                {project.name}
              </ThemedText>
            </View>
            {project.description ? (
              <ThemedText themeColor="textSecondary">{project.description}</ThemedText>
            ) : null}
          </View>

          {project.progress?.total ? (
            <Card>
              <View style={styles.row}>
                <ThemedText type="smallBold" style={styles.flex}>
                  Progress
                </ThemedText>
                <ThemedText type="smallBold">{Math.round(project.progress.percent)}%</ThemedText>
              </View>
              <ProgressBar percent={project.progress.percent} color={project.color} />
              <ThemedText type="small" themeColor="textSecondary">
                {project.progress.done} of {project.progress.total} tasks done
                {project.progress.major ? ` · ${project.progress.majorDone} of ${project.progress.major} major` : ''}
              </ThemedText>
            </Card>
          ) : null}

          {onTeam ? (
            <Button title="Project chat" kind="secondary" busy={opening} onPress={() => void openChat()} />
          ) : null}

          {project.goals?.length ? (
            <View style={styles.group}>
              <ThemedText type="label" themeColor="textSecondary">
                Goals
              </ThemedText>
              {project.goals.map((g) => {
                const progress = project.goalProgress?.find((p) => p.goalId === g.id);
                return (
                  <PressableCard
                    key={g.id}
                    onPress={() =>
                      router.push({
                        pathname: '/goal/[projectId]/[goalId]',
                        params: { projectId: project.id, goalId: g.id },
                      })
                    }>
                    <ThemedText type="smallBold">{g.title}</ThemedText>
                    {progress ? <ProgressBar percent={progress.percent} color={project.color} /> : null}
                    <ThemedText type="small" themeColor="textSecondary">
                      {goalLine(g, progress)}
                    </ThemedText>
                  </PressableCard>
                );
              })}
            </View>
          ) : null}

          {people.length ? (
            <View style={styles.group}>
              <ThemedText type="label" themeColor="textSecondary">
                Team · {people.length}
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.team}>
                {[...people]
                  .sort((a, b) => Number(project.leadIds.includes(b.id)) - Number(project.leadIds.includes(a.id)))
                  .map((p) => (
                    <View key={p.id} style={styles.person}>
                      <Avatar uri={p.avatar} name={p.name} size={44} />
                      <ThemedText type="small" numberOfLines={1} style={styles.personName}>
                        {p.id === me ? 'You' : (p.name?.split(' ')[0] ?? '—')}
                      </ThemedText>
                      {project.leadIds.includes(p.id) ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          Lead
                        </ThemedText>
                      ) : null}
                    </View>
                  ))}
              </ScrollView>
            </View>
          ) : null}

          {pages.data?.objective || topPages.length ? (
            <View>
              <ThemedText type="label" themeColor="textSecondary">
                Pages
              </ThemedText>
              {pages.data?.objective ? (
                <Row
                  icon="flag"
                  title={pages.data.objective.title || 'Objective'}
                  chevron
                  onPress={() =>
                    router.push({
                      pathname: '/page/[projectId]/[pageId]',
                      params: { projectId: project.id, pageId: pages.data!.objective!.id },
                    })
                  }
                />
              ) : null}
              {topPages.map((p) => (
                <Row
                  key={p.id}
                  icon="page"
                  title={`${p.emoji ? `${p.emoji} ` : ''}${p.title || 'Untitled'}`}
                  detail={childCount(p.id) ? `${childCount(p.id)} pages inside` : null}
                  chevron
                  onPress={() =>
                    router.push({
                      pathname: '/page/[projectId]/[pageId]',
                      params: { projectId: project.id, pageId: p.id },
                    })
                  }
                />
              ))}
            </View>
          ) : null}

          <View style={styles.group}>
            <ThemedText type="label" themeColor="textSecondary">
              Tasks
            </ThemedText>
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: 'mine', label: `Yours ${lists.mine.length}` },
                { value: 'open', label: `Open ${lists.open.length}` },
                { value: 'done', label: 'Done' },
              ]}
            />
            {lists[view].length ? (
              <Card style={styles.tasks}>
                {lists[view].map((t) =>
                  isMine(t) ? (
                    <TaskRow key={t.id} task={t} showDay />
                  ) : (
                    <View key={t.id} style={styles.other}>
                      <ThemedText>{t.title}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {[nameOf(t.assigneeIds?.[0] ?? t.ownerId), statusLabel(t)].filter(Boolean).join(' · ')}
                      </ThemedText>
                    </View>
                  ),
                )}
              </Card>
            ) : (
              <ThemedText themeColor="textSecondary">
                {view === 'mine' ? 'Nothing open for you here.' : view === 'open' ? 'No open tasks.' : 'Nothing finished yet.'}
              </ThemedText>
            )}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  group: { gap: Spacing.two },
  team: { gap: Spacing.three },
  person: { alignItems: 'center', width: 64, gap: 2 },
  personName: { maxWidth: 64 },
  tasks: { gap: 0, paddingVertical: Spacing.one },
  other: { paddingVertical: Spacing.two + Spacing.one, gap: 2 },
});
