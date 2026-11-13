import { Stack } from 'expo-router';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Dot, Notice, QueryState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type AppUpdateNotice, markAppUpdatesRead, useAppUpdateNotices } from '@/lib/app-updates';
import { timeAgo } from '@/lib/dates';
import { openLink } from '@/lib/links';
import { unreadCount, useMarkNotifications, useNotifications } from '@/lib/notifications';
import type { PortalNotification } from '@/lib/types';

/**
 * The website's bell: newest first; tap one to open what it is about. App
 * updates (a fix ready after a restart, a newer store version) sit on top.
 */
export default function NotificationsScreen() {
  const query = useNotifications();
  const mark = useMarkNotifications();
  const updates = useAppUpdateNotices();
  const list = query.data?.notifications ?? [];
  const unread = unreadCount(query.data);
  const unreadUpdates = updates.filter((u) => !u.isRead).map((u) => u.id);

  return (
    <Screen
      edgeTop={false}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }>
      <Stack.Screen
        options={{
          headerRight: () =>
            unread || unreadUpdates.length ? (
              <ThemedText
                type="smallBold"
                onPress={() => {
                  markAppUpdatesRead(unreadUpdates);
                  if (unread) mark.mutate({ all: true, isRead: true });
                }}>
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
      {query.data && !list.length && !updates.length ? <Notice title="You’re all caught up" /> : null}
      <View>
        {updates.map((u) => (
          <UpdateItem key={u.id} notice={u} />
        ))}
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

function UpdateItem({ notice: u }: { notice: AppUpdateNotice }) {
  const theme = useTheme();
  const open = () => {
    markAppUpdatesRead([u.id]);
    u.run();
  };
  return (
    <Pressable
      accessibilityRole="button"
      onPress={open}
      onLongPress={() => markAppUpdatesRead([u.id])}
      style={({ pressed }) => [styles.item, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}>
      <View style={styles.dot}>{!u.isRead ? <Dot color={theme.accent} /> : null}</View>
      <View style={styles.flex}>
        <ThemedText type={u.isRead ? 'small' : 'smallBold'}>{u.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {u.description}
        </ThemedText>
        <View style={styles.actions}>
          <Button title={u.action} small onPress={open} />
        </View>
      </View>
    </Pressable>
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
