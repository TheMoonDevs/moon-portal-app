import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DaySheet, WorkBar } from '@/components/day-sheet';
import { Icon } from '@/components/icon';
import { MonthGrid } from '@/components/month-grid';
import { OfflineBanner } from '@/components/offline-banner';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Dot, IconButton, Notice, ProgressBar, QueryState, Segmented } from '@/components/ui';
import { buffOf, buffProgress } from '@/constants/buff';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, portalUrl, withQuery } from '@/lib/api';
import { type DayMode, DAY_MODES, groupsFor, workTally } from '@/lib/day';
import { addDays, dayTitle, fromKey, monthOf, monthRange, monthTitle, todayKey } from '@/lib/dates';
import { openLink } from '@/lib/links';
import { useMarkNotifications } from '@/lib/notifications';
import type { Day, Days, MonthScore } from '@/lib/types';
import { clearWorkReminders, linkOf, useWorkNotifications } from '@/lib/work-badge';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
/** Days either side of the anchor the pager holds. */
const SPAN = 180;

/**
 * The day's worklog, as on the website: by project (the default), as a plan
 * or as work done. Swipe for the day before or after; the date opens a
 * calendar; the month's badge sits top right.
 */
export default function WorkScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ date?: string }>();
  const today = todayKey();
  const [date, setDate] = useState(today);
  const [mode, setMode] = useState<DayMode>('projects');
  const [calendar, setCalendar] = useState(false);
  // The pager holds a year around this day; a day further away moves it.
  const [anchor, setAnchor] = useState(today);

  // A link to a day (a reminder, a notification) opens it.
  const [lastParam, setLastParam] = useState<string | undefined>(undefined);
  if (params.date !== lastParam) {
    setLastParam(params.date);
    if (params.date && DAY_KEY.test(params.date)) {
      setDate(params.date);
      if (Math.abs(fromKey(params.date).getTime() - fromKey(anchor).getTime()) > (SPAN - 7) * 86400000)
        setAnchor(params.date);
    }
  }

  // Opening the tab clears the work reminders it counts.
  useFocusEffect(
    useCallback(() => {
      void clearWorkReminders();
    }, []),
  );

  const days = useMemo(
    () => Array.from({ length: SPAN * 2 + 1 }, (_, i) => addDays(anchor, i - SPAN)),
    [anchor],
  );
  const index = days.indexOf(date);
  const list = useRef<FlatList<string>>(null);

  const go = (next: string) => {
    if (next === date) return;
    const i = days.indexOf(next);
    setDate(next);
    if (i < 0) {
      setAnchor(next);
      return;
    }
    list.current?.scrollToIndex({ index: i, animated: Math.abs(i - index) <= 7 });
  };

  const month = monthOf(date);
  const range = monthRange(month);
  const monthDays = useQuery({
    queryKey: ['days', range.from, range.to],
    queryFn: () => api<Days>(withQuery('/api/me/days', range)),
  });
  const score = useQuery({
    queryKey: ['month', month],
    queryFn: () => api<MonthScore>(withQuery('/api/me/month', { month })),
  });

  return (
    <View style={[styles.flex, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.top}>
          <Pressable
            onPress={() => setCalendar(true)}
            accessibilityRole="button"
            accessibilityHint="Pick a day"
            style={({ pressed }) => [styles.flex, { opacity: pressed ? 0.7 : 1 }]}>
            <ThemedText type="title" numberOfLines={1}>
              {dayTitle(date, today)}
            </ThemedText>
            <View style={styles.dateLine}>
              <ThemedText type="small" themeColor="textSecondary">
                {fromKey(date).toLocaleDateString(undefined, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </ThemedText>
              <Icon name="chevronDown" size={12} color={theme.textSecondary} />
            </View>
          </Pressable>
          <MonthBadge score={score.data} onPress={() => setCalendar(true)} />
        </View>
        <WeekStrip date={date} today={today} days={monthDays.data} onPick={go} />
        <Segmented value={mode} onChange={setMode} options={DAY_MODES} />
      </View>

      <FlatList
        key={anchor}
        ref={list}
        style={styles.flex}
        data={days}
        // The pages show the picked view: draw them again when it changes.
        extraData={mode}
        keyExtractor={(d) => d}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={Math.max(0, index)}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          if (days[i] && days[i] !== date) setDate(days[i]);
        }}
        renderItem={({ item }) => (
          <DayPage date={item} today={today} mode={mode} width={width} bottom={insets.bottom} />
        )}
      />

      <CalendarSheet
        visible={calendar}
        date={date}
        onClose={() => setCalendar(false)}
        onPick={(d) => {
          setCalendar(false);
          go(d);
        }}
      />
    </View>
  );
}

/* ------------------------------- Month badge ------------------------------ */

function MonthBadge({ score, onPress }: { score?: MonthScore; onPress: () => void }) {
  const theme = useTheme();
  const points = score?.points ?? 0;
  const buff = buffOf(points);
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`${buff.title}, ${points} points this month`}
      style={({ pressed }) => [
        styles.badge,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Image source={{ uri: portalUrl(buff.src) }} style={styles.badgeImage} contentFit="contain" />
      <View>
        <ThemedText type="smallBold" numberOfLines={1} style={styles.badgeTitle}>
          {buff.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.badgePoints}>
          {score ? `${points} pts` : '…'}
        </ThemedText>
      </View>
    </Pressable>
  );
}

/* -------------------------------- Week strip ------------------------------ */

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function WeekStrip({
  date,
  today,
  days,
  onPick,
}: {
  date: string;
  today: string;
  days?: Days;
  onPick: (day: string) => void;
}) {
  const theme = useTheme();
  const monday = addDays(date, -((fromKey(date).getDay() + 6) % 7));
  return (
    <View style={styles.week}>
      {LETTERS.map((letter, i) => {
        const day = addDays(monday, i);
        const on = day === date;
        const worked = (days?.days[day] ?? []).length > 0;
        return (
          <Pressable key={day} onPress={() => onPick(day)} style={styles.weekDay}>
            <ThemedText type="small" themeColor="textSecondary">
              {letter}
            </ThemedText>
            <View
              style={[
                styles.weekNumber,
                on && { backgroundColor: theme.accent },
                !on && day === today && { borderColor: theme.text, borderWidth: 1.5 },
              ]}>
              <ThemedText
                type={on || day === today ? 'smallBold' : 'small'}
                style={on && { color: theme.onAccent }}>
                {Number(day.slice(8))}
              </ThemedText>
            </View>
            <Dot size={4} color={worked ? theme.success : 'transparent'} />
          </Pressable>
        );
      })}
    </View>
  );
}

/* --------------------------------- A day --------------------------------- */

function DayPage({
  date,
  today,
  mode,
  width,
  bottom,
}: {
  date: string;
  today: string;
  mode: DayMode;
  width: number;
  bottom: number;
}) {
  const day = useQuery({
    queryKey: ['day', date],
    queryFn: () => api<Day>(withQuery('/api/me/day', { date })),
  });
  const groups = day.data ? groupsFor(mode, day.data, date) : [];
  const ahead = date > today;

  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={[styles.page, { paddingBottom: bottom + Spacing.six }]}
      refreshControl={<RefreshControl refreshing={day.isRefetching} onRefresh={() => void day.refetch()} />}>
      {date === today ? <OfflineBanner /> : null}
      {date === today ? <WorkUpdates /> : null}
      <View style={styles.actions}>
        <Button
          title="Log work"
          small
          icon={<Icon name="pencil" size={16} />}
          kind="secondary"
          onPress={() => router.push('/log')}
          style={styles.flex}
        />
        <Button
          title="Add a task"
          small
          icon={<Icon name="add" size={16} />}
          kind="secondary"
          onPress={() => router.push('/new-task')}
          style={styles.flex}
        />
      </View>
      <QueryState
        loading={day.isPending}
        error={day.data ? null : day.error}
        onRetry={() => void day.refetch()}
        what="this day"
      />
      {day.data && mode === 'work' ? <WorkBar {...workTally(day.data, date)} /> : null}
      {day.data && !groups.length ? (
        <Notice
          title={ahead ? 'Nothing planned yet' : 'Nothing on this day'}
          body={ahead ? 'Add a task for this day.' : 'Log what you worked on, or add a task.'}
        />
      ) : null}
      {day.data ? <DaySheet day={day.data} date={date} mode={mode} groups={groups} /> : null}
    </ScrollView>
  );
}

/** Unread notifications about work, on today's page. */
function WorkUpdates() {
  const theme = useTheme();
  const updates = useWorkNotifications();
  const mark = useMarkNotifications();
  if (!updates.length) return null;
  return (
    <Card style={styles.updates}>
      <ThemedText type="label" themeColor="textSecondary">
        Work updates · {updates.length}
      </ThemedText>
      {updates.slice(0, 4).map((n) => (
        <Pressable
          key={n.id}
          onPress={() => {
            mark.mutate({ ids: [n.id], isRead: true });
            void openLink(linkOf(n));
          }}
          style={({ pressed }) => [styles.update, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}>
          <Dot color={theme.danger} size={8} />
          <View style={styles.flex}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {n.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {n.description}
            </ThemedText>
          </View>
        </Pressable>
      ))}
    </Card>
  );
}

/* -------------------------------- Calendar -------------------------------- */

function CalendarSheet({
  visible,
  date,
  onClose,
  onPick,
}: {
  visible: boolean;
  date: string;
  onClose: () => void;
  onPick: (day: string) => void;
}) {
  const theme = useTheme();
  const today = todayKey();
  const [month, setMonth] = useState(monthOf(date));
  const [shownFor, setShownFor] = useState(date);
  // Opening on another day shows its month.
  if (shownFor !== date) {
    setShownFor(date);
    setMonth(monthOf(date));
  }
  const range = monthRange(month);
  const days = useQuery({
    queryKey: ['days', range.from, range.to],
    queryFn: () => api<Days>(withQuery('/api/me/days', range)),
    enabled: visible,
  });
  const score = useQuery({
    queryKey: ['month', month],
    queryFn: () => api<MonthScore>(withQuery('/api/me/month', { month })),
    enabled: visible,
  });
  const points = score.data?.points ?? 0;
  const buff = buffOf(points);
  const lines = (day: string) => days.data?.days[day] ?? [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.sheet}>
        <View style={styles.sheetHead}>
          <ThemedText type="subtitle" style={styles.flex}>
            Pick a day
          </ThemedText>
          <IconButton name="close" label="Close" onPress={onClose} />
        </View>
        <Card style={styles.buffCard}>
          <Image source={{ uri: portalUrl(buff.src) }} style={styles.buffImage} contentFit="contain" />
          <View style={[styles.flex, styles.buffText]}>
            <ThemedText type="label" themeColor="textSecondary">
              {monthTitle(month)} · {score.data?.days ?? 0} days
            </ThemedText>
            <ThemedText type="subtitle">{buff.title}</ThemedText>
            <ProgressBar percent={buffProgress(points)} />
            <ThemedText type="small" themeColor="textSecondary">
              {points} pts · {score.data?.finished ?? 0} tasks finished · {Math.max(0, buff.next - points)} to the next
            </ThemedText>
          </View>
        </Card>
        <Card>
          <MonthGrid
            month={month}
            onMonth={setMonth}
            selected={date}
            onDay={onPick}
            tone={(day) => (lines(day).length ? theme.backgroundSelected : null)}
            mark={(day) => {
              const l = lines(day);
              if (!l.length) return null;
              const missed = l.some((x) => x.goalMissed);
              const done = l.some((x) => x.status === 'done');
              return <Dot size={5} color={missed ? theme.danger : done ? theme.success : theme.textSecondary} />;
            }}
          />
        </Card>
        {date !== today ? <Button title="Go to today" kind="secondary" onPress={() => onPick(today)} /> : null}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  dateLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: Spacing.one,
    paddingRight: Spacing.three,
    paddingVertical: Spacing.one,
    maxWidth: 170,
  },
  badgeImage: { width: 38, height: 38 },
  badgeTitle: { fontSize: 13, lineHeight: 16 },
  badgePoints: { fontSize: 12, lineHeight: 15 },
  week: { flexDirection: 'row' },
  weekDay: { flex: 1, alignItems: 'center', gap: 3 },
  weekNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    padding: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  actions: { flexDirection: 'row', gap: Spacing.two },
  updates: { gap: 0 },
  update: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheet: { padding: Spacing.three, gap: Spacing.three },
  sheetHead: { flexDirection: 'row', alignItems: 'center' },
  buffCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  buffImage: { width: 72, height: 72, borderRadius: Radius.medium },
  buffText: { gap: Spacing.one },
});
