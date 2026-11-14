import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar, Card, Notice, QueryState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmUnblock, useBlocked } from '@/lib/blocks';

/** The people the user blocked in chat, each with Unblock. */
export default function BlockedScreen() {
  const theme = useTheme();
  const blocked = useBlocked({ fresh: true });
  const people = blocked.data?.people ?? [];

  return (
    <Screen edgeTop={false}>
      <ThemedText themeColor="textSecondary">
        You don’t see messages from people you block, in any chat, and they can’t message you. They aren’t told.
      </ThemedText>
      {blocked.isPending || (blocked.error && !blocked.data) ? (
        <QueryState
          loading={blocked.isPending}
          error={blocked.data ? null : blocked.error}
          onRetry={() => void blocked.refetch()}
          what="blocked people"
        />
      ) : people.length ? (
        <Card style={styles.list}>
          {people.map((p, i) => (
            <View
              key={p.id}
              style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}>
              <Avatar uri={p.avatar} name={p.name} size={36} />
              <View style={styles.flex}>
                <ThemedText numberOfLines={1}>{p.name || 'Someone'}</ThemedText>
                {p.positionTitle ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {p.positionTitle}
                  </ThemedText>
                ) : null}
              </View>
              <ThemedText
                type="smallBold"
                themeColor="danger"
                accessibilityRole="button"
                onPress={() => confirmUnblock(p)}>
                Unblock
              </ThemedText>
            </View>
          ))}
        </Card>
      ) : (
        <Notice title="No one blocked" body="Long-press a message in a chat to report it or block its sender." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingVertical: 0, gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
});
