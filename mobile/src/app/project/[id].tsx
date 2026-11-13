import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ProjectHeader } from '@/components/project-header';
import { ProjectWorklogs } from '@/components/project-worklogs';
import { TaskRow } from '@/components/task-list';
import { ThemedText } from '@/components/themed-text';
import {
  Avatar,
  Card,
  IconButton,
  PressableCard,
  ProgressBar,
  QueryState,
  Row,
  Screen,
  Segmented,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, messageOf } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { accentOf, pickKit } from '@/lib/brand';
import { goalLine } from '@/lib/goals';
import { openWebsite } from '@/lib/links';
import { isCoreProject, useCompanyLookup, useProjectLabel } from '@/lib/project-name';
import { queryClient } from '@/lib/query';
import { statusLabel } from '@/lib/tasks';
import type { ChatConversation, ProjectDetail, ProjectGoal, ProjectPage, Task } from '@/lib/types';

type TaskView = 'mine' | 'open' | 'done';

/**
 * A project, like a channel page: its brand at the top (banner, logo,
 * colours; its leads pick the banner), then progress, team, pages, tasks,
 * goals and the team's worklogs.
 */
export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const label = useProjectLabel();
  const companyOf = useCompanyLookup();
  const { profile } = useAuth();
  const me = profile?.id ?? '';
  const [view, setView] = useState<TaskView>('mine');
  const [goalView, setGoalView] = useState<TaskView>('mine');
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
  const isLead = !!project && project.leadIds.includes(me);

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
  // Goals the same way: yours (naming you, or the whole team's), open, met.
  const progressOf = (goalId: string) => project?.goalProgress?.find((p) => p.goalId === goalId);
  const goalMet = (g: ProjectGoal) => {
    const progress = progressOf(g.id);
    if (g.kind === 'target') return !!g.achievedAt || !!progress?.achieved;
    return !!progress && progress.done >= progress.target;
  };
  const goals = project?.goals ?? [];
  const forMe = (g: ProjectGoal) => (g.assigneeIds?.length ? g.assigneeIds.includes(me) : onTeam);
  const goalLists: Record<TaskView, ProjectGoal[]> = {
    mine: goals.filter((g) => forMe(g) && !goalMet(g)),
    open: goals.filter((g) => !goalMet(g)),
    done: goals.filter(goalMet),
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

  const company = companyOf(project?.companyId);
  const core = isCoreProject(project);
  // The project's own kit; the company's for its core project.
  const kit = pickKit(project?.brandKit, core ? company?.brandKit : null);
  const accent = accentOf(kit) ?? project?.color ?? company?.color ?? null;
  const openCount = live.filter((t) => t.status !== 'DONE').length;

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
            void queryClient.invalidateQueries({ queryKey: ['project', id, 'worklogs'] });
          }}
        />
      }>
      <Stack.Screen options={{ title: project ? label(project).name : 'Project' }} />
      <QueryState
        loading={query.isPending}
        error={query.data ? null : query.error}
        onRetry={() => void query.refetch()}
        what="this project"
      />
      {project ? (
        <>
          <ProjectHeader
            name={label(project).name}
            handle={[
              core ? 'Company work' : project.slug ? `@${project.slug}` : null,
              core ? null : company?.name,
            ]
              .filter(Boolean)
              .join(' · ')}
            stats={[
              `${people.length} ${people.length === 1 ? 'person' : 'people'}`,
              `${openCount} open ${openCount === 1 ? 'task' : 'tasks'}`,
              project.progress?.total ? `${Math.round(project.progress.percent)}% done` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            description={project.description ?? (core ? company?.description : null)}
            kit={kit}
            banner={project.headerImage}
            onEditBanner={
              isLead
                ? () => router.push({ pathname: '/header-image', params: { id: project.id } })
                : undefined
            }
            logo={core ? (company?.logo ?? null) : (project.logo ?? null)}
            color={project.color ?? company?.color}
            actions={
              <>
                {onTeam ? (
                  <Pressable
                    disabled={opening}
                    onPress={() => void openChat()}
                    style={({ pressed }) => [
                      styles.chatPill,
                      { backgroundColor: theme.accent, opacity: opening ? 0.6 : pressed ? 0.8 : 1 },
                    ]}>
                    <Icon name="chat" size={16} color={theme.onAccent} />
                    <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                      {opening ? 'Opening…' : 'Chat'}
                    </ThemedText>
                  </Pressable>
                ) : null}
                <IconButton
                  name="globe"
                  label="Open on the website"
                  onPress={() => void openWebsite(`/projects/${project.id}`)}
                />
              </>
            }
          />

          {project.progress?.total ? (
            <Card>
              <View style={styles.row}>
                <ThemedText type="smallBold" style={styles.flex}>
                  Progress
                </ThemedText>
                <ThemedText type="smallBold">{Math.round(project.progress.percent)}%</ThemedText>
              </View>
              <ProgressBar percent={project.progress.percent} color={accent} />
              <ThemedText type="small" themeColor="textSecondary">
                {project.progress.done} of {project.progress.total} tasks done
                {project.progress.major ? ` · ${project.progress.majorDone} of ${project.progress.major} major` : ''}
              </ThemedText>
            </Card>
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

          {pages.data ? (
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
              <Row
                icon="add"
                title="New page"
                detail="Write down an idea"
                onPress={() =>
                  router.push({
                    pathname: '/page/[projectId]/[pageId]',
                    params: { projectId: project.id, pageId: 'new' },
                  })
                }
              />
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

          {project.goals?.length ? (
            <View style={styles.group}>
              <ThemedText type="label" themeColor="textSecondary">
                Goals
              </ThemedText>
              <Segmented
                value={goalView}
                onChange={setGoalView}
                options={[
                  { value: 'mine', label: `Yours ${goalLists.mine.length}` },
                  { value: 'open', label: `Open ${goalLists.open.length}` },
                  { value: 'done', label: `Done ${goalLists.done.length}` },
                ]}
              />
              {goalLists[goalView].length ? (
                goalLists[goalView].map((g) => {
                  const progress = progressOf(g.id);
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
                      {progress ? <ProgressBar percent={progress.percent} color={accent} /> : null}
                      <ThemedText type="small" themeColor="textSecondary">
                        {goalLine(g, progress)}
                      </ThemedText>
                    </PressableCard>
                  );
                })
              ) : (
                <ThemedText themeColor="textSecondary">
                  {goalView === 'mine'
                    ? 'No open goals for you here.'
                    : goalView === 'open'
                      ? 'Every goal is met.'
                      : 'No goal met yet.'}
                </ThemedText>
              )}
            </View>
          ) : null}

          <ProjectWorklogs projectId={project.id} me={me} color={accent} />

        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  group: { gap: Spacing.two },
  team: { gap: Spacing.three },
  person: { alignItems: 'center', width: 64, gap: 2 },
  personName: { maxWidth: 64 },
  tasks: { gap: 0, paddingVertical: Spacing.one },
  other: { paddingVertical: Spacing.two + Spacing.one, gap: 2 },
});
