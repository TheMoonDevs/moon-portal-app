import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { CompanyMark } from '@/components/company-mark';
import { FilterChip, ProgressRing } from '@/components/project-bits';
import { ThemedText } from '@/components/themed-text';
import { Avatar, Notice, QueryState, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dayTitle } from '@/lib/dates';
import { PLAN_STATUS, stepCount, usePlans } from '@/lib/plans';
import { projectName } from '@/lib/project-name';

type Filter = 'ACTIVE' | 'IDEA' | 'DONE';

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#34d399',
  IDEA: '#fcd34d',
  DONE: '#737373',
  DROPPED: '#fb7185',
};

/**
 * Plans across the person's companies, in the projects page's cards: being
 * done, ideas, and finished. Each shows its project, who owns it, its end
 * date and a ring for the steps done.
 */
export default function PlansScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<Filter>('ACTIVE');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const query = usePlans();
  const data = query.data;
  const inCompany = (data?.plans ?? []).filter((p) => !companyId || p.companyId === companyId);
  const shown = inCompany.filter((p) =>
    filter === 'DONE' ? p.status === 'DONE' || p.status === 'DROPPED' : p.status === filter,
  );
  const companies = (data?.companies ?? []).filter((c) => (data?.plans ?? []).some((p) => p.companyId === c.id));
  const projectOf = (id?: string | null) => data?.projects.find((p) => p.id === id);
  const companyOf = (id: string) => data?.companies.find((c) => c.id === id);
  const personOf = (id: string) => data?.people.find((p) => p.id === id);
  const count = (status: Filter) =>
    inCompany.filter((p) => (status === 'DONE' ? p.status === 'DONE' || p.status === 'DROPPED' : p.status === status))
      .length;

  return (
    <Screen
      edgeTop={false}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {(['ACTIVE', 'IDEA', 'DONE'] as Filter[]).map((f) => (
          <FilterChip
            key={f}
            label={`${f === 'ACTIVE' ? 'Active' : f === 'IDEA' ? 'Ideas' : 'Finished'} ${count(f)}`}
            on={filter === f}
            onPress={() => setFilter(f)}
            mark={<View style={[styles.dot, { backgroundColor: STATUS_COLOR[f] }]} />}
          />
        ))}
      </ScrollView>
      {companies.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <FilterChip label="All companies" on={!companyId} onPress={() => setCompanyId(null)} />
          {companies.map((c) => (
            <FilterChip
              key={c.id}
              label={c.name}
              on={companyId === c.id}
              onPress={() => setCompanyId(c.id)}
              mark={<CompanyMark id={c.id} name={c.name} color={c.color} size={16} />}
            />
          ))}
        </ScrollView>
      ) : null}
      <QueryState
        loading={query.isPending}
        error={data ? null : query.error}
        onRetry={() => void query.refetch()}
        what="plans"
      />
      {data && !shown.length ? <Notice title="No plans here" /> : null}
      {shown.map((plan) => {
        const steps = stepCount(plan);
        const project = projectOf(plan.projectId);
        const company = companyOf(plan.companyId);
        const owner = personOf(plan.ownerId);
        const color = project?.color || company?.color || '#10b981';
        return (
          <Pressable
            key={plan.id}
            onPress={() => router.push({ pathname: '/plan/[id]', params: { id: plan.id } })}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: theme.backgroundElement, borderColor: pressed ? color : theme.border },
            ]}>
            <View style={styles.cardTop}>
              <CompanyMark
                id={project?.id ?? plan.companyId}
                name={project ? projectName(project, company?.name) : (company?.name ?? plan.title)}
                color={project?.color ?? company?.color}
                size={40}
              />
              <View style={styles.flex}>
                <ThemedText type="smallBold" numberOfLines={2}>
                  {plan.title}
                </ThemedText>
                <View style={styles.meta}>
                  <View style={[styles.dot, { backgroundColor: STATUS_COLOR[plan.status] ?? '#737373' }]} />
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.flex}>
                    {[
                      PLAN_STATUS[plan.status],
                      project ? projectName(project, company?.name) : `${company?.name ?? 'Company'} plan`,
                      plan.endOn ? `by ${dayTitle(plan.endOn)}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </ThemedText>
                </View>
              </View>
              {steps.total ? <ProgressRing percent={Math.round((steps.done / steps.total) * 100)} color={color} /> : null}
            </View>
            {plan.notes ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                {plan.notes}
              </ThemedText>
            ) : null}
            <View style={styles.foot}>
              {owner ? <Avatar uri={owner.avatar} name={owner.name} size={20} /> : null}
              <ThemedText type="small" themeColor="textSecondary" style={styles.flex} numberOfLines={1}>
                {owner?.name ? `${owner.name} · ` : ''}
                {steps.total ? `${steps.done} of ${steps.total} steps done` : 'No steps yet'}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { gap: Spacing.two, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  card: { gap: Spacing.two + Spacing.one, padding: Spacing.three, borderRadius: Radius.large, borderWidth: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
