import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar, Button, Card, QueryState } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { dayTitle } from '@/lib/dates';
import type { ProjectWorklogs as Worklogs } from '@/lib/types';

const STEP = 8;

/**
 * Who worked on what in the project, newest day first: one card per person
 * per day with the tasks they logged (✓ when finished). The last two weeks.
 */
export function ProjectWorklogs({ projectId, me, color }: { projectId: string; me: string; color?: string | null }) {
  const theme = useTheme();
  const [shown, setShown] = useState(STEP);
  const query = useQuery({
    queryKey: ['project', projectId, 'worklogs'],
    queryFn: () => api<Worklogs>(`/api/projects/${projectId}/worklogs?days=14`),
  });
  const entries = [...(query.data?.entries ?? [])].sort(
    (a, b) => b.date.localeCompare(a.date) || (a.userId === me ? -1 : b.userId === me ? 1 : 0),
  );
  const userOf = (id: string) => query.data?.users.find((u) => u.id === id);

  return (
    <View style={styles.group}>
      <ThemedText type="label" themeColor="textSecondary">
        Worklogs · last 2 weeks
      </ThemedText>
      <QueryState
        loading={query.isPending}
        error={query.data ? null : query.error}
        onRetry={() => void query.refetch()}
        what="the worklogs"
      />
      {query.data && !entries.length ? (
        <ThemedText themeColor="textSecondary">No work logged here in the last two weeks.</ThemedText>
      ) : null}
      {entries.slice(0, shown).map((e, i) => {
        const user = userOf(e.userId);
        const newDay = i === 0 || entries[i - 1].date !== e.date;
        return (
          <View key={e.id} style={styles.group}>
            {newDay ? (
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.day}>
                {dayTitle(e.date)}
              </ThemedText>
            ) : null}
            <Card style={styles.card}>
              <View style={styles.who}>
                <Avatar uri={user?.avatar} name={user?.name} size={26} />
                <ThemedText type="smallBold" style={styles.flex} numberOfLines={1}>
                  {e.userId === me ? 'You' : (user?.name ?? 'Someone')}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {e.lines.length} {e.lines.length === 1 ? 'task' : 'tasks'}
                </ThemedText>
              </View>
              {e.lines.map((l) => (
                <Pressable
                  key={l.key}
                  disabled={!l.taskId}
                  onPress={() => l.taskId && router.push({ pathname: '/task/[id]', params: { id: l.taskId } })}
                  style={({ pressed }) => [styles.line, { opacity: pressed ? 0.6 : 1 }]}>
                  <View
                    style={[
                      styles.mark,
                      l.done
                        ? { backgroundColor: theme.success, borderColor: theme.success }
                        : { borderColor: color || theme.textSecondary },
                    ]}>
                    {l.done ? <ThemedText style={styles.tick}>✓</ThemedText> : null}
                  </View>
                  <ThemedText style={styles.flex}>{l.text}</ThemedText>
                </Pressable>
              ))}
            </Card>
          </View>
        );
      })}
      {entries.length > shown ? (
        <Button title={`Show more (${entries.length - shown})`} kind="secondary" small onPress={() => setShown((n) => n + STEP)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: Spacing.two },
  day: { marginTop: Spacing.one },
  card: { gap: Spacing.two },
  who: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, paddingLeft: 3 },
  mark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    marginTop: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: { color: '#fff', fontSize: 10, lineHeight: 12, fontWeight: '700' },
});
