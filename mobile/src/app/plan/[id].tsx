import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Dot, ProgressBar, QueryState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dayTitle } from '@/lib/dates';
import { openWebsite } from '@/lib/links';
import { PLAN_STATUS, stepCount, usePlans } from '@/lib/plans';
import { STATUS_LABEL } from '@/lib/tasks';
import type { Plan, PlanStep } from '@/lib/types';

/** A plan, step by step. Changing it is on the website for now. */
export default function PlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { profile } = useAuth();
  const list = usePlans();
  const fromList = list.data?.plans.find((p) => p.id === id);
  const single = useQuery({
    queryKey: ['plan', id],
    queryFn: () => api<{ plan: Plan }>(`/api/plans/${id}`),
    enabled: !!list.data && !fromList,
  });
  const plan = fromList ?? single.data?.plan;
  const projectOf = (pid?: string | null) => list.data?.projects.find((p) => p.id === pid);
  const nameOf = (uid: string) =>
    uid === profile?.id ? 'You' : (list.data?.people.find((p) => p.id === uid)?.name ?? null);
  const count = plan ? stepCount(plan) : { done: 0, total: 0 };
  const project = projectOf(plan?.projectId);

  const openStep = (step: PlanStep) => {
    const mine = step.assigneeIds.includes(profile?.id ?? '');
    if (step.task && mine) router.push({ pathname: '/task/[id]', params: { id: step.task.id } });
    else if (step.goalId && step.projectId)
      router.push({ pathname: '/goal/[projectId]/[goalId]', params: { projectId: step.projectId, goalId: step.goalId } });
    else if (step.projectId) router.push({ pathname: '/project/[id]', params: { id: step.projectId } });
  };

  return (
    <Screen
      edgeTop={false}
      refreshControl={
        <RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} />
      }>
      <Stack.Screen options={{ title: plan?.title ?? 'Plan' }} />
      <QueryState
        loading={list.isPending || single.isFetching}
        error={plan ? null : (list.error ?? single.error)}
        onRetry={() => void (list.error ? list.refetch() : single.refetch())}
        what="this plan"
      />
      {plan ? (
        <>
          <View style={styles.head}>
            <ThemedText type="subtitle">{plan.title}</ThemedText>
            <View style={styles.row}>
              {project ? <Dot color={project.color} /> : null}
              <ThemedText type="small" themeColor="textSecondary">
                {[
                  project?.name ?? 'Company plan',
                  PLAN_STATUS[plan.status],
                  plan.startOn ? `from ${dayTitle(plan.startOn)}` : null,
                  plan.endOn ? `by ${dayTitle(plan.endOn)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </ThemedText>
            </View>
          </View>
          {count.total ? (
            <Card>
              <ProgressBar percent={(count.done / count.total) * 100} color={project?.color} />
              <ThemedText type="small" themeColor="textSecondary">
                {count.done} of {count.total} steps done
              </ThemedText>
            </Card>
          ) : null}
          {plan.notes ? <ThemedText>{plan.notes}</ThemedText> : null}

          <View>
            {plan.steps.map((step, i) => {
              const stepProject = projectOf(step.projectId);
              const who = step.assigneeIds.map(nameOf).filter(Boolean).join(', ');
              const info = step.kind === 'info';
              const opens = !!(step.task || step.goalId || step.projectId);
              return (
                <Pressable
                  key={step.id}
                  disabled={!opens}
                  onPress={() => openStep(step)}
                  style={({ pressed }) => [styles.step, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}>
                  {info ? (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.number}>
                      {i + 1}.
                    </ThemedText>
                  ) : (
                    <Icon
                      name={step.kind === 'goal' ? 'target' : step.done ? 'checkCircle' : 'circle'}
                      size={20}
                      color={step.done ? theme.success : theme.textSecondary}
                    />
                  )}
                  <View style={styles.flex}>
                    <ThemedText
                      style={step.done && !info && { textDecorationLine: 'line-through', color: theme.textSecondary }}>
                      {step.text}
                    </ThemedText>
                    {step.notes ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {step.notes}
                      </ThemedText>
                    ) : null}
                    {stepProject || who || step.dueOn || step.task ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {[
                          stepProject?.name,
                          who,
                          step.dueOn ? `by ${dayTitle(step.dueOn)}` : null,
                          step.task && !step.done ? STATUS_LABEL[step.task.status] : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </ThemedText>
                    ) : null}
                  </View>
                  {opens ? <Icon name="chevron" size={12} color={theme.textSecondary} /> : null}
                </Pressable>
              );
            })}
          </View>
          <Button
            title="Edit on the website"
            kind="secondary"
            onPress={() => openWebsite(`/plans?plan_id=${plan.id}`)}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + Spacing.one,
    paddingVertical: Spacing.two + Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  number: { minWidth: 20, paddingTop: 2 },
});
