import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, RefreshControl, Share, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Notice, QueryState, Screen, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, messageOf } from '@/lib/api';
import { addToCalendar } from '@/lib/calendar';
import { dayTitle, todayKey } from '@/lib/dates';
import { openWebsite } from '@/lib/links';
import { joinMeeting } from '@/lib/meet';
import { queryClient, refreshWork } from '@/lib/query';
import type { MeetBooking, MeetProfile } from '@/lib/types';

type View_ = 'upcoming' | 'past';

const clockOf = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

/** Meetings people booked with them, and their booking link to share. */
export default function MeetingsScreen() {
  const [view, setView] = useState<View_>('upcoming');
  const bookings = useQuery({
    queryKey: ['bookings'],
    queryFn: () => api<{ bookings: MeetBooking[] }>('/api/meet/bookings'),
  });
  const profile = useQuery({
    queryKey: ['meetProfile'],
    queryFn: () => api<{ profile: MeetProfile; link: string }>('/api/meet/profile'),
  });
  const now = new Date().toISOString();
  const all = bookings.data?.bookings ?? [];
  const live = all.filter((b) => b.status !== 'DECLINED' && b.status !== 'CANCELLED');
  const shown =
    view === 'upcoming'
      ? live.filter((b) => b.end > now)
      : [...all.filter((b) => b.end <= now || b.status === 'DECLINED' || b.status === 'CANCELLED')].reverse();

  return (
    <Screen
      edgeTop={false}
      refreshControl={
        <RefreshControl
          refreshing={bookings.isRefetching}
          onRefresh={() => {
            void bookings.refetch();
            void profile.refetch();
          }}
        />
      }>
      <BookingLink data={profile.data} loading={profile.isPending} />
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'past', label: 'Past 30 days' },
        ]}
      />
      <QueryState
        loading={bookings.isPending}
        error={bookings.data ? null : bookings.error}
        onRetry={() => void bookings.refetch()}
        what="your meetings"
      />
      {bookings.data && !shown.length ? (
        <Notice
          title={view === 'upcoming' ? 'No meetings coming up' : 'Nothing in the last 30 days'}
          body={view === 'upcoming' ? 'Share your booking link and people can pick a time.' : undefined}
        />
      ) : null}
      {shown.map((b) => (
        <BookingCard key={b.id} booking={b} past={view === 'past'} />
      ))}
    </Screen>
  );
}

function BookingLink({ data, loading }: { data?: { profile: MeetProfile; link: string }; loading: boolean }) {
  const theme = useTheme();
  const [saving, setSaving] = useState(false);
  if (loading || !data) return null;
  const { profile, link } = data;

  const setActive = async (isActive: boolean) => {
    setSaving(true);
    try {
      const res = await api<{ profile: MeetProfile; link: string }>('/api/meet/profile', {
        method: 'PUT',
        body: { isActive },
      });
      queryClient.setQueryData(['meetProfile'], res);
    } catch (e) {
      Alert.alert('Couldn’t change your booking link', messageOf(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.flex}>
          <ThemedText type="smallBold">Your booking link</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {profile.isActive
              ? `${profile.durationMinutes}-minute meetings${profile.title ? ` · ${profile.title}` : ''}`
              : 'Off: nobody can book you'}
          </ThemedText>
        </View>
        <Switch
          value={profile.isActive}
          disabled={saving}
          onValueChange={(v) => void setActive(v)}
          trackColor={{ true: theme.success }}
        />
      </View>
      <ThemedText selectable numberOfLines={1} style={{ color: theme.textSecondary }}>
        {link.replace(/^https?:\/\//, '')}
      </ThemedText>
      <View style={styles.row}>
        <Button
          title="Copy"
          kind="secondary"
          small
          style={styles.flex}
          onPress={() => {
            void Clipboard.setStringAsync(link);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        />
        <Button
          title="Share"
          small
          style={styles.flex}
          onPress={() => void Share.share({ message: `Book a time with me: ${link}`, url: link })}
        />
      </View>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        onPress={() => void openWebsite('/meet')}
        style={styles.link}>
        Hours, length and questions are set on the website ›
      </ThemedText>
    </Card>
  );
}

function BookingCard({ booking: b, past }: { booking: MeetBooking; past: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const today = todayKey();
  const day = todayKey(new Date(b.start));

  const act = (action: 'approve' | 'decline' | 'cancel') => {
    const run = async () => {
      setBusy(action);
      try {
        await api(`/api/meet/bookings/${b.id}`, { method: 'POST', body: { action } });
        void queryClient.invalidateQueries({ queryKey: ['bookings'] });
        refreshWork();
      } catch (e) {
        Alert.alert('Couldn’t update the meeting', messageOf(e));
      } finally {
        setBusy(null);
      }
    };
    if (action === 'approve') return void run();
    Alert.alert(
      action === 'decline' ? `Decline ${b.guestName}’s request?` : `Cancel the meeting with ${b.guestName}?`,
      'They get an email about it.',
      [
        { text: 'Keep it', style: 'cancel' },
        { text: action === 'decline' ? 'Decline' : 'Cancel meeting', style: 'destructive', onPress: () => void run() },
      ],
    );
  };

  const status =
    b.status === 'PENDING'
      ? 'Waiting for you to approve'
      : b.status === 'PROPOSED'
        ? 'You proposed a new time'
        : b.status === 'DECLINED'
          ? 'Declined'
          : b.status === 'CANCELLED'
            ? 'Cancelled'
            : null;

  return (
    <Card>
      <ThemedText type="label" themeColor="textSecondary">
        {dayTitle(day, today)} · {clockOf(b.start)}–{clockOf(b.end)}
      </ThemedText>
      <ThemedText type="smallBold">
        {b.guestName}
        {b.role ? ` · interview for ${b.role}` : ''}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" selectable>
        {b.guestEmail}
      </ThemedText>
      {status ? (
        <ThemedText type="small" themeColor={b.status === 'PENDING' ? 'danger' : 'textSecondary'}>
          {status}
        </ThemedText>
      ) : null}
      {b.guestNote ? <ThemedText>“{b.guestNote}”</ThemedText> : null}
      {!past ? (
        <View style={styles.row}>
          {b.status === 'PENDING' ? (
            <>
              <Button title="Approve" small busy={busy === 'approve'} style={styles.flex} onPress={() => act('approve')} />
              <Button title="Decline" kind="secondary" small busy={busy === 'decline'} style={styles.flex} onPress={() => act('decline')} />
            </>
          ) : b.status === 'CONFIRMED' ? (
            <>
              <Button title="Join" small style={styles.flex} onPress={() => void joinMeeting(`/meet/join/${b.id}`)} />
              <Button
                title="Calendar"
                kind="secondary"
                small
                style={styles.flex}
                onPress={() =>
                  void addToCalendar({
                    title: `Meeting with ${b.guestName}`,
                    start: b.start,
                    end: b.end,
                    notes: b.guestNote,
                    url: b.meetingUrl,
                  })
                }
              />
            </>
          ) : null}
        </View>
      ) : null}
      {!past && (b.status === 'CONFIRMED' || b.status === 'PROPOSED') ? (
        <ThemedText type="small" themeColor="danger" onPress={() => act('cancel')} style={styles.link}>
          Cancel meeting
        </ThemedText>
      ) : null}
      {!past ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.link} onPress={() => void openWebsite(`/meet?booking=${b.id}`)}>
          Propose another time on the website ›
        </ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  link: { paddingTop: Spacing.one },
});
