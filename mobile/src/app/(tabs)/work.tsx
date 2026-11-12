import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { CompanyChip } from '@/components/company-chip';
import { Icon, type IconName } from '@/components/icon';
import { OfflineBanner } from '@/components/offline-banner';
import { ThemedText } from '@/components/themed-text';
import { Dot, Field, Notice, PressableCard, ProgressBar, QueryState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, withQuery } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCompany } from '@/lib/company';
import type { Project } from '@/lib/types';

/** The company's work: its projects, goals, plans and leaderboard. */
export default function WorkScreen() {
  const { company } = useCompany();
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['projects', company?.id],
    queryFn: () => api<{ projects: Project[] }>(withQuery('/api/projects', { companyId: company?.id })),
    enabled: !!company,
  });
  const words = search.trim().toLowerCase();
  const all = query.data?.projects ?? [];
  const mine = (p: Project) => !!profile && (p.leadIds.includes(profile.id) || p.memberIds.includes(profile.id));
  const shown = all
    .filter((p) => !words || p.name.toLowerCase().includes(words))
    .sort((a, b) => Number(mine(b)) - Number(mine(a)));
  const yours = shown.filter(mine);
  const others = shown.filter((p) => !mine(p));

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }>
      <ThemedText type="title">Work</ThemedText>
      <OfflineBanner />
      <CompanyChip />
      <View style={styles.tiles}>
        <Tile icon="target" title="Goals" onPress={() => router.push('/goals')} />
        <Tile icon="map" title="Plans" onPress={() => router.push('/plans')} />
        <Tile icon="trophy" title="Leaderboard" onPress={() => router.push('/leaderboard')} />
      </View>
      {all.length > 6 ? (
        <Field
          value={search}
          onChangeText={setSearch}
          placeholder="Search projects"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      ) : null}
      <QueryState
        loading={query.isPending && !!company}
        error={query.data ? null : query.error}
        onRetry={() => void query.refetch()}
        what="projects"
      />
      {query.data && !shown.length ? <Notice title="No projects" body={words ? undefined : 'Nothing in this company yet.'} /> : null}
      {[
        { title: 'Your projects', list: yours },
        { title: yours.length ? 'Other projects' : 'Projects', list: others },
      ]
        .filter((g) => g.list.length)
        .map((g) => (
          <View key={g.title} style={styles.group}>
            <ThemedText type="label" themeColor="textSecondary">
              {g.title}
            </ThemedText>
            {g.list.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </View>
        ))}
    </Screen>
  );
}

function Tile({ icon, title, onPress }: { icon: IconName; title: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableCard onPress={onPress} style={styles.tile}>
      <Icon name={icon} size={22} color={theme.text} />
      <ThemedText type="smallBold">{title}</ThemedText>
    </PressableCard>
  );
}

function ProjectCard({ project: p }: { project: Project }) {
  const goals = p.goalProgress ?? [];
  const goalsMet = goals.filter((g) => g.percent >= 100).length;
  return (
    <PressableCard onPress={() => router.push({ pathname: '/project/[id]', params: { id: p.id } })}>
      <View style={styles.row}>
        <Dot color={p.color} size={10} />
        <ThemedText type="smallBold" style={styles.flex} numberOfLines={1}>
          {p.name}
        </ThemedText>
        {p.status !== 'ACTIVE' ? (
          <ThemedText type="small" themeColor="textSecondary">
            {p.status.charAt(0) + p.status.slice(1).toLowerCase().replace('_', ' ')}
          </ThemedText>
        ) : null}
      </View>
      {p.progress && p.progress.total ? (
        <>
          <ProgressBar percent={p.progress.percent} color={p.color} />
          <ThemedText type="small" themeColor="textSecondary">
            {p.progress.done} of {p.progress.total} tasks done
            {goals.length ? ` · ${goalsMet} of ${goals.length} goals on track` : ''}
          </ThemedText>
        </>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          No tasks yet{goals.length ? ` · ${goals.length} goal${goals.length === 1 ? '' : 's'}` : ''}
        </ThemedText>
      )}
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tiles: { flexDirection: 'row', gap: Spacing.two },
  tile: { flex: 1, alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three },
  group: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
