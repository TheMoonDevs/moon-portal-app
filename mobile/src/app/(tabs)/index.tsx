import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { CompanyMark } from '@/components/company-mark';
import { Icon } from '@/components/icon';
import { OfflineBanner } from '@/components/offline-banner';
import { PortalMark } from '@/components/portal-mark';
import { ThemedText } from '@/components/themed-text';
import { Avatar, Card, Chip, Dot, IconButton, QueryState, Screen } from '@/components/ui';
import { QUOTES } from '@/constants/quotes';
import { Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { api, withQuery } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCompany } from '@/lib/company';
import { fromKey, monthOf, todayKey } from '@/lib/dates';
import { joinMeeting } from '@/lib/meet';
import { projectNameInCompany } from '@/lib/project-name';
import { useNotifications, useUnreadCount } from '@/lib/notifications';
import type { Company, Day, LeaderboardRow, Project, Task, Workspace } from '@/lib/types';

/*
 * Home, as on the website: hello with the time, the date and the day's
 * meetings; a quote; the companies (each opens to its projects); and the
 * month's leaderboard.
 */
export default function HomeScreen() {
  const date = todayKey();
  const notifications = useNotifications();
  const unread = useUnreadCount();
  const day = useQuery({
    queryKey: ['day', date],
    queryFn: () => api<Day>(withQuery('/api/me/day', { date })),
  });
  const workspace = useQuery({
    queryKey: ['workspace'],
    queryFn: () => api<Workspace>('/api/workspace'),
  });
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([day.refetch(), workspace.refetch(), notifications.refetch()]).catch(() => null);
    setRefreshing(false);
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}>
      <View style={styles.top}>
        <PortalMark size={26} />
        <ThemedText type="label" style={styles.brand}>
          Portal
        </ThemedText>
        <IconButton
          name="bell"
          label="Notifications"
          count={unread}
          onPress={() => router.push('/notifications')}
        />
      </View>
      <OfflineBanner />
      <HelloCard day={day.data} date={date} />
      <QuoteCard date={date} />
      <CompaniesSection
        workspace={workspace.data}
        error={workspace.error}
        loading={workspace.isPending}
        onRetry={() => void workspace.refetch()}
      />
      <LeaderboardSection />
    </Screen>
  );
}

/* --------------------------------- Hello --------------------------------- */

function HelloCard({ day, date }: { day?: Day; date: string }) {
  const theme = useTheme();
  const { profile } = useAuth();
  const now = useNow();
  const meetings = (day?.tasks ?? [])
    .filter((t): t is Task & { meeting: NonNullable<Task['meeting']> } =>
      !!t.meeting && t.status !== 'DONE' && todayKey(new Date(t.meeting.start)) === date,
    )
    .sort((a, b) => (a.meeting.start < b.meeting.start ? -1 : 1));
  const timezone =
    profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'your time';

  return (
    <Card style={styles.hello}>
      <Pressable
        onPress={() => router.push({ pathname: '/person/[id]', params: { id: 'me' } })}
        style={({ pressed }) => [styles.helloTop, { opacity: pressed ? 0.7 : 1 }]}>
        <Avatar uri={profile?.avatar} name={profile?.name} size={52} />
        <View style={styles.flex}>
          <ThemedText type="small" themeColor="textSecondary">
            Hello,
          </ThemedText>
          <ThemedText type="subtitle" numberOfLines={1}>
            {profile?.name || 'there'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {[profile?.username ? `@${profile.username}` : null, profile?.positionTitle]
              .filter(Boolean)
              .join(' · ')}
          </ThemedText>
        </View>
      </Pressable>

      <View style={[styles.rule, { backgroundColor: theme.border }]} />

      <View style={styles.nowRow}>
        <ThemedText type="small" style={styles.flex}>
          It’s{' '}
          <ThemedText type="smallBold">
            {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </ThemedText>{' '}
          now.
        </ThemedText>
        <Pressable
          hitSlop={8}
          onPress={() => router.navigate('/work')}
          style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}>
          <Icon name="pencil" size={14} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            My worklogs
          </ThemedText>
        </Pressable>
      </View>

      <View>
        <ThemedText style={styles.bigDate}>
          {fromKey(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {fromKey(date).toLocaleDateString(undefined, { weekday: 'long' })} | {timezone.replace(/_/g, ' ')}
        </ThemedText>
      </View>

      <View style={[styles.rule, { backgroundColor: theme.border }]} />

      <ThemedText type="label" themeColor="textSecondary">
        Meetings today
      </ThemedText>
      {meetings.length ? (
        meetings.map((t) => {
          const over = new Date(t.meeting.end).getTime() < now.getTime();
          return (
            <Pressable
              key={t.id}
              onPress={() => router.push({ pathname: '/task/[id]', params: { id: t.id } })}
              style={({ pressed }) => [styles.meeting, { opacity: pressed ? 0.7 : over ? 0.5 : 1 }]}>
              <Icon name="video" size={16} color={theme.textSecondary} />
              <ThemedText type="smallBold" style={styles.meetingTime}>
                {t.meeting.time}
              </ThemedText>
              <ThemedText type="small" numberOfLines={1} style={styles.flex}>
                {t.meeting.with}
                {t.meeting.status !== 'CONFIRMED' ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {'  '}not confirmed
                  </ThemedText>
                ) : null}
              </ThemedText>
              {t.meeting.joinUrl && !over ? (
                <Pressable
                  hitSlop={6}
                  onPress={() => void joinMeeting(t.meeting.joinUrl!)}
                  style={({ pressed }) => [
                    styles.join,
                    { backgroundColor: theme.accent, opacity: pressed ? 0.7 : 1 },
                  ]}>
                  <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                    Join
                  </ThemedText>
                </Pressable>
              ) : null}
            </Pressable>
          );
        })
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          {day ? 'No meetings today.' : '…'}
        </ThemedText>
      )}
    </Card>
  );
}

/* --------------------------------- Quote --------------------------------- */

function QuoteCard({ date }: { date: string }) {
  const theme = useTheme();
  // A new quote each day, the same all day.
  const index = Math.floor(fromKey(date).getTime() / 86400000) % QUOTES.length;
  const { quote, author } = QUOTES[index];
  return (
    <View style={[styles.quote, { borderColor: theme.border }]}>
      <Icon name="quote" size={22} color={theme.textSecondary} />
      <ThemedText style={styles.quoteText}>{quote}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        — {author}
      </ThemedText>
    </View>
  );
}

/* ------------------------------- Companies ------------------------------- */

const roleLabel = (keys?: string[] | null) =>
  (keys ?? []).map((k) => k.charAt(0).toUpperCase() + k.slice(1)).join(', ');

function CompaniesSection({
  workspace,
  loading,
  error,
  onRetry,
}: {
  workspace?: Workspace;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const companies = [...(workspace?.companies ?? [])].sort(
    (a, b) => Number(!!a.company.isPersonal) - Number(!!b.company.isPersonal),
  );
  return (
    <View style={styles.section}>
      <ThemedText type="subtitle">Your companies</ThemedText>
      <QueryState loading={loading} error={workspace ? null : error} onRetry={onRetry} what="your companies" />
      {companies.length ? (
        <Card style={styles.list}>
          {companies.map(({ company, member }, i) => (
            <CompanyItem
              key={company.id}
              company={company}
              role={company.isPersonal ? 'Only you' : member ? roleLabel(member.roleKeys) || 'Member' : 'Visible to you'}
              open={open === company.id}
              first={i === 0}
              onToggle={() => setOpen(open === company.id ? null : company.id)}
            />
          ))}
        </Card>
      ) : null}
    </View>
  );
}

function CompanyItem({
  company,
  role,
  open,
  first,
  onToggle,
}: {
  company: Company;
  role: string;
  open: boolean;
  first: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const { profile } = useAuth();
  const projects = useQuery({
    queryKey: ['projects', company.id],
    queryFn: () => api<{ projects: Project[] }>(withQuery('/api/projects', { companyId: company.id })),
    enabled: open,
  });
  const mine = (p: Project) =>
    !!profile && (p.leadIds.includes(profile.id) || p.memberIds.includes(profile.id));
  const list = [...(projects.data?.projects ?? [])]
    .filter((p) => p.status !== 'ARCHIVED')
    .sort((a, b) => Number(mine(b)) - Number(mine(a)) || a.name.localeCompare(b.name));

  return (
    <View style={!first && [styles.divider, { borderColor: theme.border }]}>
      <Pressable
        onPress={onToggle}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.company, { opacity: pressed ? 0.7 : 1 }]}>
        <CompanyMark
          id={company.id}
          name={company.name}
          color={company.color}
          logo={company.logo}
          personal={company.isPersonal}
        />
        <View style={styles.flex}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {company.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {role}
          </ThemedText>
        </View>
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <Icon name="chevron" size={14} color={theme.textSecondary} />
        </View>
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(180)} style={styles.projects}>
          <QueryState
            loading={projects.isPending}
            error={projects.data ? null : projects.error}
            onRetry={() => void projects.refetch()}
            what="its projects"
          />
          {projects.data && !list.length ? (
            <ThemedText type="small" themeColor="textSecondary">
              No projects yet.
            </ThemedText>
          ) : null}
          {list.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => router.push({ pathname: '/project/[id]', params: { id: p.id } })}
              style={({ pressed }) => [styles.project, { opacity: pressed ? 0.6 : 1 }]}>
              <Dot color={p.color} size={10} />
              <ThemedText type="small" numberOfLines={1} style={styles.flex}>
                {projectNameInCompany(p, company.name)}
              </ThemedText>
              {mine(p) ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {p.leadIds.includes(profile?.id ?? '') ? 'Lead' : 'Team'}
                </ThemedText>
              ) : null}
              {p.progress?.total ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.percent}>
                  {Math.round(p.progress.percent)}%
                </ThemedText>
              ) : null}
              <Icon name="chevron" size={12} color={theme.textSecondary} />
            </Pressable>
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}

/* ------------------------------ Leaderboard ------------------------------ */

const MEDALS = ['🥇', '🥈', '🥉'];

function LeaderboardSection() {
  const theme = useTheme();
  const { profile } = useAuth();
  const { company, companies, setCompanyId } = useCompany();
  const [pick, setPick] = useState<string | null>(null);
  const work = companies.filter((c) => !c.isPersonal);
  const shown = work.find((c) => c.id === pick) ?? (company?.isPersonal ? work[0] : company) ?? null;
  const month = monthOf(todayKey());
  const query = useQuery({
    queryKey: ['leaderboard', shown?.id, month],
    queryFn: () =>
      api<{ month: string; rows: LeaderboardRow[] }>(
        withQuery('/api/leaderboard', { companyId: shown?.id, month }),
      ),
    enabled: !!shown,
  });
  const rows = query.data?.rows ?? [];
  const top = rows.slice(0, 5);
  const mine = rows.find((r) => r.user.id === profile?.id);
  if (!shown) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <ThemedText type="subtitle" style={styles.flex}>
          Leaderboard
        </ThemedText>
        <Pressable
          hitSlop={8}
          onPress={() => {
            setCompanyId(shown.id);
            router.push('/leaderboard');
          }}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            See all
          </ThemedText>
        </Pressable>
      </View>
      {work.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {work.map((c) => (
            <Chip key={c.id} label={c.name} selected={c.id === shown.id} onPress={() => setPick(c.id)} />
          ))}
        </ScrollView>
      ) : null}
      <Card style={styles.list}>
        <QueryState
          loading={query.isPending}
          error={query.data ? null : query.error}
          onRetry={() => void query.refetch()}
          what="the leaderboard"
        />
        {query.data && !rows.length ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            No points yet this month.
          </ThemedText>
        ) : null}
        {[...top, ...(mine && mine.rank > top.length ? [mine] : [])].map((r, i) => (
          <Pressable
            key={r.user.id}
            accessibilityRole="button"
            accessibilityHint="Opens their page and work"
            onPress={() => router.push({ pathname: '/person/[id]', params: { id: r.user.id } })}
            style={({ pressed }) => [
              styles.board,
              i > 0 && [styles.divider, { borderColor: theme.border }],
              r.user.id === profile?.id && { backgroundColor: theme.backgroundSelected },
              { opacity: pressed ? 0.6 : 1 },
            ]}>
            <ThemedText type="smallBold" style={styles.rank}>
              {MEDALS[r.rank - 1] ?? r.rank}
            </ThemedText>
            <Avatar uri={r.user.avatar} name={r.user.name} size={34} />
            <View style={styles.flex}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {r.user.id === profile?.id ? 'You' : (r.user.name ?? r.user.username ?? 'Someone')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {r.tasksDone} tasks · {r.worklogDays} days{r.buff ? ` · ${r.buff.title}` : ''}
              </ThemedText>
            </View>
            <ThemedText type="smallBold">{r.points.toLocaleString()}</ThemedText>
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  brand: { flex: 1, letterSpacing: 3 },
  hello: { gap: Spacing.three, padding: Spacing.three + Spacing.one },
  helloTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rule: { height: StyleSheet.hairlineWidth },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  link: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  bigDate: { fontSize: 40, lineHeight: 44, fontWeight: 900, letterSpacing: -1 },
  meeting: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 32 },
  meetingTime: { minWidth: 92, fontVariant: ['tabular-nums'] },
  join: { borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  quote: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderLeftWidth: 3,
    marginVertical: Spacing.one,
  },
  quoteText: { fontSize: 18, lineHeight: 26, fontStyle: 'italic' },
  section: { gap: Spacing.two, marginTop: Spacing.two },
  sectionHead: { flexDirection: 'row', alignItems: 'center' },
  list: { paddingVertical: 0, paddingHorizontal: 0, gap: 0, overflow: 'hidden' },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  company: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  projects: { paddingLeft: 56 + Spacing.three, paddingRight: Spacing.three, paddingBottom: Spacing.two },
  project: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 40 },
  percent: { minWidth: 36, textAlign: 'right' },
  chips: { gap: Spacing.two },
  board: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  rank: { width: 26, textAlign: 'center' },
  empty: { padding: Spacing.three },
});

