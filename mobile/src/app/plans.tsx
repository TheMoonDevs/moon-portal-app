import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { CompanyChip } from '@/components/company-chip';
import { ThemedText } from '@/components/themed-text';
import { Dot, Notice, PressableCard, ProgressBar, QueryState, Screen, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useCompany } from '@/lib/company';
import { dayTitle } from '@/lib/dates';
import { PLAN_STATUS, stepCount, usePlans } from '@/lib/plans';

type Filter = 'ACTIVE' | 'IDEA' | 'DONE';

/** The company's plans: what is being done, ideas, and what is finished. */
export default function PlansScreen() {
  const { company } = useCompany();
  const [filter, setFilter] = useState<Filter>('ACTIVE');
  const query = usePlans();
  const all = (query.data?.plans ?? []).filter((p) => !company || p.companyId === company.id);
  const shown = all.filter((p) =>
    filter === 'DONE' ? p.status === 'DONE' || p.status === 'DROPPED' : p.status === filter,
  );
  const projectOf = (id?: string | null) => query.data?.projects.find((p) => p.id === id);

  return (
    <Screen
      edgeTop={false}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }>
      <CompanyChip />
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'ACTIVE', label: `Active ${all.filter((p) => p.status === 'ACTIVE').length}` },
          { value: 'IDEA', label: `Ideas ${all.filter((p) => p.status === 'IDEA').length}` },
          { value: 'DONE', label: 'Finished' },
        ]}
      />
      <QueryState
        loading={query.isPending}
        error={query.data ? null : query.error}
        onRetry={() => void query.refetch()}
        what="plans"
      />
      {query.data && !shown.length ? <Notice title="No plans here" /> : null}
      {shown.map((plan) => {
        const count = stepCount(plan);
        const project = projectOf(plan.projectId);
        return (
          <PressableCard
            key={plan.id}
            onPress={() => router.push({ pathname: '/plan/[id]', params: { id: plan.id } })}>
            <ThemedText type="smallBold">{plan.title}</ThemedText>
            <View style={styles.row}>
              {project ? <Dot color={project.color} /> : null}
              <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                {[
                  project?.name ?? 'Company plan',
                  PLAN_STATUS[plan.status],
                  plan.endOn ? `by ${dayTitle(plan.endOn)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </ThemedText>
            </View>
            {count.total ? (
              <>
                <ProgressBar percent={(count.done / count.total) * 100} color={project?.color} />
                <ThemedText type="small" themeColor="textSecondary">
                  {count.done} of {count.total} steps done
                </ThemedText>
              </>
            ) : null}
          </PressableCard>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
