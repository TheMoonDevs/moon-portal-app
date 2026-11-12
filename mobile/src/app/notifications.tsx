import { Stack } from 'expo-router';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Dot, Notice, QueryState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/lib/dates';
import { openLink } from '@/lib/links';
import { unreadCount, useMarkNotifications, useNotifications } from '@/lib/notifications';
import type { PortalNotification } from '@/lib/types';

/** The website's bell: newest first; tap one to open what it is about. */
export default function NotificationsScreen() {
  const query = useNotifications();
  const mark = useMarkNotifications();
  const list = query.data?.notifications ?? [];
  const unread = unreadCount(query.data);

  return (
    <Screen
      edgeTop={false}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }>
      <Stack.Screen
        options={{
          headerRight: () =>
            unread ? (
              <ThemedText type="smallBold" onPress={() => mark.mutate({ all: true, isRead: true })}>
                Read all
              </ThemedText>
            ) : null,
        }}
      />
      <QueryState
        loading={query.isPending}
        error={query.data ? null : query.error}
        onRetry={() => void query.refetch()}
        what="notifications"
      />
      {query.data && !list.length ? <Notice title="You’re all caught up" /> : null}
      <View>
        {list.map((n) => (
          <Item
            key={n.id}
            notification={n}
            onRead={(isRead) => mark.mutate({ ids: [n.id], isRead })}
          />
        ))}
      </View>
    </Screen>
  );
}

function Item({
  notification: n,
  onRead,
}: {
  notification: PortalNotification;
  onRead: (isRead: boolean) => void;
}) {
  const theme = useTheme();
  const actions = n.notificationData?.actionDone ? [] : (n.notificationData?.actions ?? []);
  const first = n.notificationData?.actions?.[0]?.trigger;
  return (
    <Pressable
      onPress={() => {
        if (!n.isRead) onRead(true);
        if (first) void openLink(first);
      }}
      onLongPress={() => onRead(!n.isRead)}
      style={({ pressed }) => [styles.item, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}>
      <View style={styles.dot}>{!n.isRead ? <Dot color={theme.accent} /> : null}</View>
      <View style={styles.flex}>
        <View style={styles.row}>
          <ThemedText type={n.isRead ? 'small' : 'smallBold'} style={styles.flex}>
            {n.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {timeAgo(n.createdAt)}
          </ThemedText>
        </View>
        {n.description ? (
          <ThemedText type="small" themeColor="textSecondary">
            {n.description}
          </ThemedText>
        ) : null}
        {actions.length > 1 ? (
          <View style={styles.actions}>
            {actions.map((a) => (
              <Button
                key={a.title}
                title={a.title}
                kind="secondary"
                small
                onPress={() => {
                  if (!n.isRead) onRead(true);
                  void openLink(a.trigger);
                }}
              />
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  item: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 10, paddingTop: 7 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
});
