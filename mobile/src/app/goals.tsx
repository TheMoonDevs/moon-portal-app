import { router } from 'expo-router';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { CompanyChip } from '@/components/company-chip';
import { ThemedText } from '@/components/themed-text';
import { Dot, Notice, PressableCard, ProgressBar, QueryState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useCompany } from '@/lib/company';
import { monthOf, todayKey } from '@/lib/dates';
import { goalLine, useGoals } from '@/lib/goals';

/** Every goal in the company, by project: how each is doing now. */
export default function GoalsScreen() {
  const { company } = useCompany();
  const { profile } = useAuth();
  const me = profile?.id ?? '';
  const query = useGoals(monthOf(todayKey()));
  const data = query.data;
  const projects = (data?.projects ?? []).filter((p) => !company || p.companyId === company.id);
  const onTeam = (p: (typeof projects)[number]) =>
    (p.leadIds ?? []).includes(me) || (p.memberIds ?? []).includes(me);
  const groups = projects
    .map((p) => ({ project: p, goals: (data?.goals ?? []).filter((g) => g.projectId === p.id) }))
    .filter((g) => g.goals.length)
    .sort((a, b) => Number(onTeam(b.project)) - Number(onTeam(a.project)));

  return (
    <Screen
      edgeTop={false}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }>
      <CompanyChip />
      <QueryState
        loading={query.isPending}
        error={query.data ? null : query.error}
        onRetry={() => void query.refetch()}
        what="goals"
      />
      {data && !groups.length ? (
        <Notice title="No goals yet" body="Goals set on the company’s projects show here." />
      ) : null}
      {groups.map(({ project, goals }) => (
        <View key={project.id} style={styles.group}>
          <View style={styles.row}>
            <Dot color={project.color} />
            <ThemedText type="label" themeColor="textSecondary">
              {project.name}
            </ThemedText>
          </View>
          {goals.map((g) => {
            const mine = (g.assigneeIds ?? []).includes(me);
            return (
              <PressableCard
                key={g.id}
                onPress={() =>
                  router.push({
                    pathname: '/goal/[projectId]/[goalId]',
                    params: { projectId: project.id, goalId: g.id },
                  })
                }>
                <View style={styles.row}>
                  <ThemedText type="smallBold" style={styles.flex}>
                    {g.title}
                  </ThemedText>
                  {mine ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      Yours
                    </ThemedText>
                  ) : null}
                </View>
                <ProgressBar percent={g.progress.percent} color={project.color} />
                <ThemedText type="small" themeColor="textSecondary">
                  {goalLine(g, g.progress)}
                </ThemedText>
              </PressableCard>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
