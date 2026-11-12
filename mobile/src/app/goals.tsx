import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { CompanyMark } from '@/components/company-mark';
import { Icon } from '@/components/icon';
import { FilterChip, ProgressRing } from '@/components/project-bits';
import { ThemedText } from '@/components/themed-text';
import { Notice, QueryState, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { monthOf, todayKey } from '@/lib/dates';
import { goalLine, PERIOD_EACH, useGoals } from '@/lib/goals';
import { isCoreProject, projectName } from '@/lib/project-name';
import type { Workspace } from '@/lib/types';

/**
 * Every goal across the person's companies, by project, in the projects
 * page's cards: a ring for how far along it is now, its line ("2 of 3 this
 * week") and whether it repeats or is a target.
 */
export default function GoalsScreen() {
  const theme = useTheme();
  const { profile } = useAuth();
  const me = profile?.id ?? '';
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const query = useGoals(monthOf(todayKey()));
  const workspace = useQuery({ queryKey: ['workspace'], queryFn: () => api<Workspace>('/api/workspace') });
  const companyOf = (id: string) => workspace.data?.companies.find((c) => c.company.id === id)?.company;
  const data = query.data;
  const onTeam = (p: NonNullable<typeof data>['projects'][number]) =>
    (p.leadIds ?? []).includes(me) || (p.memberIds ?? []).includes(me);
  const withGoals = (data?.projects ?? []).filter((p) => (data?.goals ?? []).some((g) => g.projectId === p.id));
  const companies = (workspace.data?.companies ?? [])
    .map((c) => c.company)
    .filter((c) => withGoals.some((p) => p.companyId === c.id));
  const groups = withGoals
    .filter((p) => (!companyId || p.companyId === companyId) && (!onlyMine || onTeam(p)))
    .map((p) => ({
      project: p,
      goals: (data?.goals ?? []).filter(
        (g) => g.projectId === p.id && (!onlyMine || !(g.assigneeIds ?? []).length || (g.assigneeIds ?? []).includes(me)),
      ),
    }))
    .filter((g) => g.goals.length)
    .sort((a, b) => Number(onTeam(b.project)) - Number(onTeam(a.project)));

  return (
    <Screen
      edgeTop={false}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}>
      {companies.length > 1 || withGoals.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <FilterChip label="All" on={!companyId} onPress={() => setCompanyId(null)} />
          {companies.map((c) => (
            <FilterChip
              key={c.id}
              label={c.name}
              on={companyId === c.id}
              onPress={() => setCompanyId(c.id)}
              mark={<CompanyMark id={c.id} name={c.name} color={c.color} logo={c.logo} size={16} />}
            />
          ))}
          <View style={[styles.rule, { backgroundColor: theme.border }]} />
          <FilterChip
            label="Mine"
            on={onlyMine}
            onPress={() => setOnlyMine((v) => !v)}
            mark={<Icon name="person" size={14} color={onlyMine ? theme.onAccent : theme.textSecondary} />}
          />
        </ScrollView>
      ) : null}
      <QueryState
        loading={query.isPending}
        error={query.data ? null : query.error}
        onRetry={() => void query.refetch()}
        what="goals"
      />
      {data && !groups.length ? (
        <Notice
          title={onlyMine ? 'No goals of yours here' : 'No goals yet'}
          body="Add one with + on the Work tab, or on a project."
        />
      ) : null}
      {groups.map(({ project, goals }) => (
        <View key={project.id} style={styles.group}>
          <View style={styles.groupHead}>
            <CompanyMark
              id={project.id}
              name={projectName(project, companyOf(project.companyId)?.name)}
              color={project.color ?? companyOf(project.companyId)?.color}
              logo={isCoreProject(project) ? companyOf(project.companyId)?.logo : null}
              size={24}
            />
            <ThemedText type="smallBold" style={styles.flex} numberOfLines={1}>
              {projectName(project, companyOf(project.companyId)?.name)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {goals.length} goal{goals.length === 1 ? '' : 's'}
            </ThemedText>
          </View>
          {goals.map((g) => {
            const mine = (g.assigneeIds ?? []).includes(me);
            const color = project.color || '#10b981';
            const met = g.progress.percent >= 100 || !!g.achievedAt;
            return (
              <Pressable
                key={g.id}
                onPress={() =>
                  router.push({
                    pathname: '/goal/[projectId]/[goalId]',
                    params: { projectId: project.id, goalId: g.id },
                  })
                }
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: pressed ? color : theme.border,
                  },
                ]}>
                <ProgressRing percent={Math.round(g.progress.percent)} color={color} />
                <View style={styles.flex}>
                  <View style={styles.nameRow}>
                    <ThemedText type="smallBold" numberOfLines={2} style={styles.shrink}>
                      {g.title}
                    </ThemedText>
                    {mine ? <Icon name="person" size={13} color="#f59e0b" /> : null}
                  </View>
                  <ThemedText type="small" style={met ? { color: '#34d399' } : { color: theme.textSecondary }}>
                    {goalLine(g, g.progress)}
                  </ThemedText>
                </View>
                <View style={[styles.kind, { borderColor: theme.border }]}>
                  <Icon name={g.kind === 'target' ? 'target' : 'history'} size={12} color={theme.textSecondary} />
                  <ThemedText type="small" themeColor="textSecondary" style={styles.kindText}>
                    {g.kind === 'target' ? 'Target' : `${g.target} ${PERIOD_EACH[g.period] ?? ''}`.trim()}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  chips: { gap: Spacing.two, alignItems: 'center' },
  rule: { width: StyleSheet.hairlineWidth, height: 18, marginHorizontal: Spacing.one },
  group: { gap: Spacing.two },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.two },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  kind: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
  },
  kindText: { fontSize: 11 },
});
