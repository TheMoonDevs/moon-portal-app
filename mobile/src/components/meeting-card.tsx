import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { portalUrl } from '@/lib/api';
import { addToCalendar } from '@/lib/calendar';
import { joinMeeting } from '@/lib/meet';
import { dateTime } from '@/lib/dates';
import type { MeetingFacts } from '@/lib/types';

/** A meeting: when, with whom, and buttons to join or add it to the calendar. */
export function MeetingCard({ meeting, title }: { meeting: MeetingFacts; title: string }) {
  const join = meeting.joinUrl ? portalUrl(meeting.joinUrl) : null;
  return (
    <Card>
      <ThemedText type="label" themeColor="textSecondary">
        Meeting
      </ThemedText>
      <ThemedText type="smallBold">
        {dateTime(meeting.start)} ({meeting.time})
      </ThemedText>
      <ThemedText>With {meeting.with}</ThemedText>
      {meeting.status !== 'CONFIRMED' ? (
        <ThemedText type="small" themeColor="danger">
          Not confirmed yet
        </ThemedText>
      ) : null}
      {meeting.note ? <ThemedText themeColor="textSecondary">{meeting.note}</ThemedText> : null}
      <View style={styles.row}>
        {join ? (
          <Button
            title="Join"
            small
            style={styles.flex}
            onPress={() => void joinMeeting(meeting.joinUrl!)}
          />
        ) : null}
        <Button
          title="Add to calendar"
          kind="secondary"
          small
          style={styles.flex}
          onPress={() =>
            void addToCalendar({
              title,
              start: meeting.start,
              end: meeting.end,
              notes: meeting.note,
              url: join,
            })
          }
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
});
