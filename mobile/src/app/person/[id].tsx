import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { CompanyMark } from '@/components/company-mark';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Avatar, Card, Dot, IconButton, Notice, QueryState, Screen, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, withQuery } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dayTitle, fromKey, todayKey } from '@/lib/dates';
import {
  type ActivityData,
  activityLevel,
  activityWeeks,
  type AgendaData,
  type AgendaItem,
  groupWork,
  itemProjectId,
  itemTitle,
  type Period,
  type PeriodKind,
  periodLabel,
  periodOf,
  shiftPeriod,
  streakOf,
  type TaskGroup,
  upNext,
  type WorkData,
} from '@/lib/people';

type Tab = 'work' | 'ahead';

const EMOJI: Record<string, string> = {
  doing: '🟡',
  done: '✅',
  not_done: '❌',
  blocked: '🔴',
  waiting: '❓',
};

/**
 * A person's page, as on the website: who they are, six months of activity,
 * their work by company, project and task, and what is up next.
 */
export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const personId = id === 'me' ? (profile?.id ?? '') : id;
  const isSelf = !!profile && personId === profile.id;
  const today = todayKey();
  const [tab, setTab] = useState<Tab>('work');
  const [period, setPeriod] = useState<Period>(() => periodOf('week', today));

  const work = useQuery({
    queryKey: ['person-work', personId, period.from, period.to],
    queryFn: () =>
      api<WorkData>(withQuery(`/api/people/${personId}/work`, { from: period.from, to: period.to })),
    enabled: !!personId,
    placeholderData: (previous) => previous,
  });
  const activity = useQuery({
    queryKey: ['person-activity', personId],
    queryFn: () => api<ActivityData>(`/api/people/${personId}/activity`),
    enabled: !!personId,
  });
  const agenda = useQuery({
    queryKey: ['person-agenda', personId],
    queryFn: () => api<AgendaData>(`/api/people/${personId}/agenda`),
    enabled: !!personId && tab === 'ahead',
  });

  const person = work.data?.person ?? (isSelf ? profile : null);
  const companies = (work.data?.companies ?? []).filter((c) => !c.isPersonal);

  return (
    <Screen
      edgeTop={false}
      refreshControl={
        <RefreshControl
          refreshing={work.isRefetching}
          onRefresh={() => {
            void work.refetch();
            void activity.refetch();
            if (tab === 'ahead') void agenda.refetch();
          }}
        />
      }>
      <Stack.Screen
        options={{
          title: isSelf ? 'Your page' : (person?.name ?? ''),
          headerRight: isSelf
            ? () => <IconButton name="pencil" label="Edit profile" onPress={() => router.push('/profile')} />
            : undefined,
        }}
      />

      <View style={styles.profile}>
        <Avatar uri={person?.avatar} name={person?.name} size={72} />
        <View style={styles.flex}>
          <ThemedText type="subtitle" numberOfLines={2}>
            {person?.name ?? ' '}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {[person?.positionTitle, person?.username ? `@${person.username}` : null]
              .filter(Boolean)
              .join(' · ')}
          </ThemedText>
        </View>
      </View>
      {companies.length ? (
        <View style={styles.chips}>
          {companies.map((c) => (
            <CompanyChipView key={c.id} id={c.id} name={c.name} color={c.color} logo={c.logo} />
          ))}
        </View>
      ) : null}

      <Activity data={activity.data} selected={period} onPick={(day) => setPeriod(periodOf('day', day))} />

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'work', label: 'Work' },
          { value: 'ahead', label: 'Up next' },
        ]}
      />

      {tab === 'work' ? (
        <WorkView data={work.data} period={period} onPeriod={setPeriod} loading={work.isPending} error={work.data ? null : work.error} onRetry={() => void work.refetch()} />
      ) : (
        <AgendaView data={agenda.data} loading={agenda.isPending} error={agenda.data ? null : agenda.error} onRetry={() => void agenda.refetch()} />
      )}
    </Screen>
  );
}

function CompanyChipView({ id, name, color, logo }: { id: string; name: string; color?: string | null; logo?: string | null }) {
  const theme = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <CompanyMark id={id} name={name} color={color} logo={logo} size={18} />
      <ThemedText type="small" numberOfLines={1}>
        {name}
      </ThemedText>
    </View>
  );
}

/* -------------------------------- Activity -------------------------------- */

const LEVELS = [0.06, 0.18, 0.36, 0.6, 0.9];

function Activity({
  data,
  selected,
  onPick,
}: {
  data?: ActivityData;
  selected: Period;
  onPick: (day: string) => void;
}) {
  const theme = useTheme();
  const today = todayKey();
  const weeks = activityWeeks(today);
  const days = data?.days ?? {};
  const logged = Object.keys(days).length;
  const points = Object.values(days).reduce((n, v) => n + v, 0);
  const streak = streakOf(days, today);

  return (
    <Card>
      <View style={styles.activityHead}>
        <ThemedText type="label" themeColor="textSecondary">
          Last 6 months
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {data ? (
            <>
              <ThemedText type="smallBold">{logged}</ThemedText> days ·{' '}
              <ThemedText type="smallBold">{points}</ThemedText> points
              {streak > 1 ? (
                <>
                  {' '}
                  · <ThemedText type="smallBold">{streak}</ThemedText>-day streak
                </>
              ) : null}
            </>
          ) : (
            '…'
          )}
        </ThemedText>
      </View>
      <View style={styles.grid}>
        {weeks.map((week, w) => (
          <View key={w} style={styles.gridWeek}>
            {week.map((day) => {
              const future = day > today;
              const n = days[day] ?? 0;
              const inPeriod = day >= selected.from && day <= selected.to;
              return (
                <Pressable
                  key={day}
                  disabled={future}
                  onPress={() => onPick(day)}
                  accessibilityLabel={`${dayTitle(day, today)}: ${n ? `${n} points` : 'nothing logged'}`}
                  style={[
                    styles.square,
                    {
                      backgroundColor: future
                        ? 'transparent'
                        : `${theme.text}${Math.round(LEVELS[activityLevel(n)] * 255)
                            .toString(16)
                            .padStart(2, '0')}`,
                    },
                    inPeriod && !future && styles.inPeriod,
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
    </Card>
  );
}

/* ---------------------------------- Work ---------------------------------- */

const KINDS: { value: PeriodKind; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

function WorkView({
  data,
  period,
  onPeriod,
  loading,
  error,
  onRetry,
}: {
  data?: WorkData;
  period: Period;
  onPeriod: (p: Period) => void;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  const theme = useTheme();
  const today = todayKey();
  const label = periodLabel(period);
  const groups = data ? groupWork(data) : [];
  const points = data?.points.length ?? 0;
  const done = data?.points.filter((p) => p.status === 'done').length ?? 0;
  const atEnd = period.to >= today;

  return (
    <View style={styles.work}>
      <Segmented
        value={period.kind}
        onChange={(kind) => onPeriod(periodOf(kind, kind === 'day' ? today : period.from > today ? today : period.from))}
        options={KINDS}
      />
      <View style={styles.periodRow}>
        <IconButton name="back" label="Earlier" onPress={() => onPeriod(shiftPeriod(period, -1))} />
        <View style={styles.periodText}>
          <ThemedText type="smallBold">{label.title}</ThemedText>
          {label.range ? (
            <ThemedText type="small" themeColor="textSecondary">
              {label.range}
            </ThemedText>
          ) : null}
        </View>
        <View style={atEnd && styles.hidden}>
          <IconButton name="forward" label="Later" onPress={() => !atEnd && onPeriod(shiftPeriod(period, 1))} />
        </View>
      </View>
      {data ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {points} point{points === 1 ? '' : 's'} · {done} done · {data.doneTasks.length} task
          {data.doneTasks.length === 1 ? '' : 's'} finished
        </ThemedText>
      ) : null}
      <QueryState loading={loading} error={error} onRetry={onRetry} what="their work" />
      {data && !groups.length ? <Notice title="Nothing logged" body="No work in this period." /> : null}
      {groups.map((c) => (
        <View key={c.company?.id ?? 'none'} style={styles.companyGroup}>
          <View style={styles.companyHead}>
            {c.company ? (
              <CompanyMark
                id={c.company.id}
                name={c.company.name}
                color={c.company.color}
                logo={c.company.logo}
                personal={c.company.isPersonal}
                size={22}
              />
            ) : (
              <Dot size={10} />
            )}
            <ThemedText type="smallBold" style={styles.flex} numberOfLines={1}>
              {c.company?.name ?? 'Not placed yet'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {c.points} pts
            </ThemedText>
          </View>
          {c.projects.map((p) => (
            <Card key={p.project?.id ?? 'none'} style={styles.projectCard}>
              <Pressable
                disabled={!p.project}
                onPress={() => p.project && router.push({ pathname: '/project/[id]', params: { id: p.project.id } })}
                style={styles.projectHead}>
                <Dot color={p.project?.color} size={10} />
                <ThemedText type="label" themeColor="textSecondary" numberOfLines={1} style={styles.flex}>
                  {p.project?.name ?? 'Other work'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {p.points}
                  {p.closed ? ` · ${p.closed} ✓` : ''}
                </ThemedText>
              </Pressable>
              {p.tasks.map((t, i) => (
                <TaskLine key={t.task?.id ?? `other-${i}`} group={t} border={theme.border} />
              ))}
            </Card>
          ))}
        </View>
      ))}
      {data?.hiddenCount ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {data.hiddenCount} more in companies you’re not part of.
        </ThemedText>
      ) : null}
    </View>
  );
}

function TaskLine({ group, border }: { group: TaskGroup; border: string }) {
  const latest = group.points[0];
  const status = group.closed ? 'done' : latest?.status;
  const days = new Set(group.points.flatMap((p) => p.dates)).size;
  const last = latest?.dates[latest.dates.length - 1];
  const bot = group.points.length > 0 && group.points.every((p) => p.byClaude);
  return (
    <Pressable
      disabled={!group.task}
      onPress={() => group.task && router.push({ pathname: '/task/[id]', params: { id: group.task.id } })}
      style={({ pressed }) => [styles.taskLine, { borderColor: border, opacity: pressed ? 0.7 : 1 }]}>
      <ThemedText style={styles.emoji}>{status ? EMOJI[status] : '⚪'}</ThemedText>
      <View style={styles.flex}>
        <ThemedText numberOfLines={2}>{group.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {[
            days ? `${days} day${days === 1 ? '' : 's'}` : null,
            last ? dayTitle(last) : null,
            group.closed ? 'finished' : null,
            bot ? 'by Claude' : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </ThemedText>
      </View>
    </Pressable>
  );
}

/* --------------------------------- Up next -------------------------------- */

const KIND_COLOR: Record<AgendaItem['kind'], string> = {
  task: '#38bdf8',
  step: '#a78bfa',
  repeat: '#fbbf24',
  meeting: '#34d399',
};

const KIND_LABEL: Record<AgendaItem['kind'], string> = {
  task: 'Task',
  step: 'Plan step',
  repeat: 'Repeats',
  meeting: 'Meeting',
};

function AgendaView({
  data,
  loading,
  error,
  onRetry,
}: {
  data?: AgendaData;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  const theme = useTheme();
  const buckets = data ? upNext(data) : [];
  const projectName = (item: AgendaItem) => {
    const id = itemProjectId(item);
    return id ? data?.projects.find((p) => p.id === id)?.name : null;
  };
  const open = (item: AgendaItem) => {
    if (item.kind === 'task') router.push({ pathname: '/task/[id]', params: { id: item.task.id } });
    else if (item.kind === 'step') router.push({ pathname: '/plan/[id]', params: { id: item.step.planId } });
    else if (item.kind === 'meeting') router.push('/meetings');
    else router.push({ pathname: '/project/[id]', params: { id: item.schedule.projectId } });
  };

  return (
    <View style={styles.work}>
      <QueryState loading={loading} error={error} onRetry={onRetry} what="what’s next" />
      {data && !buckets.length ? <Notice title="All clear" body="Nothing ahead yet." /> : null}
      {buckets.map((b) => (
        <View key={b.key} style={styles.bucket}>
          <ThemedText type="label" themeColor={b.key === 'overdue' ? 'danger' : 'textSecondary'}>
            {b.label} · {b.items.length}
          </ThemedText>
          <Card style={styles.list}>
            {b.items.map((item, i) => (
              <Pressable
                key={item.id}
                onPress={() => open(item)}
                style={({ pressed }) => [
                  styles.agendaRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
                  { opacity: pressed ? 0.7 : 1 },
                ]}>
                <Dot color={KIND_COLOR[item.kind]} size={8} />
                <View style={styles.flex}>
                  <ThemedText numberOfLines={2}>{itemTitle(item)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {[
                      KIND_LABEL[item.kind],
                      item.kind === 'meeting'
                        ? new Date(item.meeting.start).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : null,
                      projectName(item),
                      item.day && b.key !== 'today' && b.key !== 'tomorrow'
                        ? fromKey(item.day).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </ThemedText>
                </View>
                <Icon name="chevron" size={12} color={theme.textSecondary} />
              </Pressable>
            ))}
          </Card>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  hidden: { opacity: 0 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: -Spacing.one },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 3,
    paddingRight: Spacing.two + 2,
    paddingVertical: 3,
    maxWidth: '100%',
  },
  activityHead: { gap: 2 },
  grid: { flexDirection: 'row', gap: 3 },
  gridWeek: { flex: 1, gap: 3 },
  square: { aspectRatio: 1, width: '100%', borderRadius: 2 },
  inPeriod: { borderWidth: 1.5, borderColor: '#38bdf8' },
  work: { gap: Spacing.three },
  periodRow: { flexDirection: 'row', alignItems: 'center' },
  periodText: { flex: 1, alignItems: 'center' },
  companyGroup: { gap: Spacing.two },
  companyHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  projectCard: { gap: 0, paddingBottom: Spacing.one },
  projectHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingBottom: Spacing.two },
  taskLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + 2,
    paddingVertical: Spacing.two + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  emoji: { fontSize: 15, lineHeight: 22, width: 20, textAlign: 'center' },
  bucket: { gap: Spacing.two },
  list: { paddingVertical: 0, gap: 0 },
  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    paddingVertical: Spacing.two + 2,
  },
});
