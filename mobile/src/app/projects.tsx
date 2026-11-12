import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { CompanyMark } from '@/components/company-mark';
import { Icon } from '@/components/icon';
import { OfflineBanner } from '@/components/offline-banner';
import { ActivityStrip, AvatarStack, FilterChip, ProgressRing, PulseDot } from '@/components/project-bits';
import { ThemedText } from '@/components/themed-text';
import { Field, Notice, QueryState, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { descendantsOf, goalLines, monthTasks, PULSES, type Pulse, pulseOf } from '@/lib/overview';
import { isCoreProject, projectNameInCompany } from '@/lib/project-name';
import type { OverviewProject, ProjectsOverview, PublicUser } from '@/lib/types';

/**
 * Every project across the person's companies, as on the website's projects
 * page: each company's projects as cards with how they are doing, the
 * month's progress, goals, the last 7 days and who worked on them.
 */
export default function ProjectsScreen() {
  const theme = useTheme();
  const { profile } = useAuth();
  const me = profile?.id ?? '';
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['projectsOverview'],
    queryFn: () => api<ProjectsOverview>('/api/projects/overview'),
  });
  const data = query.data;
  const all = data?.projects ?? [];
  const people = new Map((data?.users ?? []).map((u) => [u.id, u]));
  const isMine = (p: OverviewProject) => p.leadIds.includes(me) || p.memberIds.includes(me);
  const involves = (p: OverviewProject) => isMine(p) || descendantsOf(all, p.id).some(isMine);
  const companies = (data?.companies ?? []).filter((c) => all.some((p) => p.companyId === c.id));
  const byId = new Set(all.map((p) => p.id));
  const words = search.trim().toLowerCase();
  // Top projects only; their sub-projects show on their card.
  const tops = all.filter(
    (p) =>
      (!p.parentId || !byId.has(p.parentId)) &&
      (!companyId || p.companyId === companyId) &&
      (!onlyMine || involves(p)) &&
      (!words || p.name.toLowerCase().includes(words)),
  );
  const groups = companies
    .map((company) => ({
      company,
      projects: tops
        .filter((p) => p.companyId === company.id)
        .sort((a, b) => Number(involves(b)) - Number(involves(a))),
    }))
    .filter((g) => g.projects.length);

  return (
    <Screen
      edgeTop={false}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}>
      <OfflineBanner />
      {companies.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <FilterChip label="All" on={!companyId} onPress={() => setCompanyId(null)} />
          {companies.map((c) => (
            <FilterChip
              key={c.id}
              label={c.name}
              on={companyId === c.id}
              onPress={() => setCompanyId(c.id)}
              mark={
                <CompanyMark id={c.id} name={c.name} color={c.color} logo={c.logo} personal={c.isPersonal} size={16} />
              }
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
      <View style={styles.legend}>
        {(Object.keys(PULSES) as Pulse[]).map((key) => (
          <View key={key} style={styles.legendItem}>
            <PulseDot pulse={key} size={6} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.legendText}>
              {PULSES[key].label}
            </ThemedText>
          </View>
        ))}
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
        loading={query.isPending}
        error={data ? null : query.error}
        onRetry={() => void query.refetch()}
        what="projects"
      />
      {data && !groups.length ? (
        <Notice
          title={onlyMine ? 'You’re not on a project here' : 'No projects'}
          body={onlyMine ? 'Turn off Mine to see every project.' : undefined}
        />
      ) : null}
      {groups.map(({ company, projects }) => (
        <View key={company.id} style={styles.group}>
          <View style={styles.groupHead}>
            <CompanyMark
              id={company.id}
              name={company.name}
              color={company.color}
              logo={company.logo}
              personal={company.isPersonal}
              size={26}
            />
            <ThemedText type="smallBold" style={styles.flex} numberOfLines={1}>
              {company.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {projects.length} project{projects.length === 1 ? '' : 's'}
            </ThemedText>
          </View>
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} company={company} all={all} people={people} isMine={involves(p)} />
          ))}
        </View>
      ))}
    </Screen>
  );
}

function ProjectCard({
  project: p,
  company,
  all,
  people,
  isMine,
}: {
  project: OverviewProject;
  company?: ProjectsOverview['companies'][number];
  all: OverviewProject[];
  people: Map<string, PublicUser>;
  isMine: boolean;
}) {
  const theme = useTheme();
  // A company's general work goes by the company's name and mark.
  const core = isCoreProject(p);
  // Listed under its company: "ZONE (Core)".
  const name = projectNameInCompany(p, company?.name);
  const color = p.color || company?.color || '#10b981';
  const pulse = pulseOf(p);
  const month = monthTasks(p, all);
  const goals = goalLines(p);
  const subs = all.filter((x) => x.parentId === p.id);
  // Who worked on it this week, else its team.
  const faces = (p.activity.people.length ? p.activity.people : [...p.leadIds, ...p.memberIds])
    .filter((id, i, list) => list.indexOf(id) === i)
    .map((id) => people.get(id))
    .filter((u): u is PublicUser => !!u);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/project/[id]', params: { id: p.id } })}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: pressed ? color : theme.border,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}>
      <View style={styles.cardTop}>
        <CompanyMark id={p.id} name={name} color={core ? (company?.color ?? p.color) : p.color} logo={core ? company?.logo : p.logo} size={40} />
        <View style={styles.flex}>
          <View style={styles.nameRow}>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.shrink}>
              {name}
            </ThemedText>
            {isMine ? <Icon name="person" size={13} color="#f59e0b" /> : null}
          </View>
          <View style={styles.pulse}>
            <PulseDot pulse={pulse} />
            <ThemedText type="small" themeColor="textSecondary">
              {PULSES[pulse].label}
            </ThemedText>
            {month.overdue ? (
              <ThemedText type="small" style={{ color: PULSES.attention.color }}>
                · {month.overdue} overdue
              </ThemedText>
            ) : null}
          </View>
        </View>
        <ProgressRing percent={month.percent} color={color} />
      </View>

      {p.description ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {p.description}
        </ThemedText>
      ) : null}
      {goals.length ? (
        <View style={styles.goals}>
          {goals.map((g) => (
            <View key={g.id} style={styles.goal}>
              <Icon name={g.met ? 'check' : 'target'} size={13} color={g.met ? '#34d399' : theme.textSecondary} />
              <ThemedText type="small" style={[styles.flex, g.met && { color: '#34d399' }]}>
                {g.text}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}
      {subs.length ? (
        <View style={styles.subs}>
          {subs.slice(0, 6).map((s) => (
            <View key={s.id} style={[styles.sub, { borderColor: theme.border }]}>
              <View style={[styles.subDot, { backgroundColor: s.color || color }]} />
              <ThemedText type="small" numberOfLines={1}>
                {s.name}
              </ThemedText>
            </View>
          ))}
          {subs.length > 6 ? (
            <ThemedText type="small" themeColor="textSecondary">
              +{subs.length - 6}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      <View style={styles.cardFoot}>
        <ActivityStrip days={p.activity.days} color={color} />
        {faces.length ? <AvatarStack people={faces} /> : null}
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.footNote}>
        {month.done} of {month.done + month.open} tasks done this month · last 7 days
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  chips: { gap: Spacing.two, alignItems: 'center' },
  rule: { width: StyleSheet.hairlineWidth, height: 18, marginHorizontal: Spacing.one },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 12 },
  group: { gap: Spacing.two },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.two },
  card: {
    gap: Spacing.two + Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pulse: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  goals: { gap: 3 },
  goal: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  subs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    maxWidth: 180,
  },
  subDot: { width: 6, height: 6, borderRadius: 3 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingTop: 2 },
  footNote: { fontSize: 11, marginTop: -Spacing.one },
});
