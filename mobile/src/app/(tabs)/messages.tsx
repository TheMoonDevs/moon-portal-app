import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { OfflineBanner } from '@/components/offline-banner';
import { ThemedText } from '@/components/themed-text';
import { Avatar, Field, IconButton, Notice, QueryState, Screen, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { chatTitle, previewOf, useConversations } from '@/lib/chat';
import { shortTime } from '@/lib/dates';
import type { ChatConversation } from '@/lib/types';

type Filter = 'all' | 'unread' | 'groups';

/** Chats, newest first, as on the website's Messages page. */
export default function MessagesScreen() {
  const query = useConversations();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const words = search.trim().toLowerCase();

  const all = (query.data?.conversations ?? []).filter((c) => !c.archived);
  const shown = all
    .filter((c) =>
      filter === 'unread' ? c.unread > 0 : filter === 'groups' ? c.kind !== 'direct' : true,
    )
    .filter((c) => !words || chatTitle(c).toLowerCase().includes(words))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }>
      <View style={styles.top}>
        <ThemedText type="title" style={styles.flex}>
          Messages
        </ThemedText>
        <IconButton name="pencil" label="New chat" onPress={() => router.push('/chat/new')} />
      </View>
      <OfflineBanner />
      <Field
        value={search}
        onChangeText={setSearch}
        placeholder="Search chats"
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All' },
          { value: 'unread', label: 'Unread' },
          { value: 'groups', label: 'Groups' },
        ]}
      />
      <QueryState
        loading={query.isPending}
        error={query.data ? null : query.error}
        onRetry={() => void query.refetch()}
        what="your chats"
      />
      {query.data && !shown.length ? (
        <Notice
          title={all.length ? 'Nothing here' : 'No chats yet'}
          body={all.length ? undefined : 'Start one with anyone in your companies.'}
        />
      ) : null}
      <View>
        {shown.map((c) => (
          <ChatRow key={c.id} chat={c} />
        ))}
      </View>
    </Screen>
  );
}

function ChatRow({ chat }: { chat: ChatConversation }) {
  const theme = useTheme();
  const { profile } = useAuth();
  const last = chat.lastMessage;
  const mine = last && last.senderId === profile?.id;
  const sender =
    chat.kind !== 'direct' && last && !mine && last.kind !== 'system'
      ? `${chat.group?.members.find((m) => m.id === last.senderId)?.name?.split(' ')[0] ?? 'Someone'}: `
      : '';
  const unread = chat.unread > 0;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/chat/[id]', params: { id: chat.id } })}
      style={({ pressed }) => [styles.row, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}>
      <Avatar uri={chat.group?.avatar ?? chat.partner.avatar} name={chatTitle(chat)} size={48} />
      <View style={styles.flex}>
        <View style={styles.line}>
          <ThemedText type={unread ? 'smallBold' : 'default'} numberOfLines={1} style={styles.flex}>
            {chatTitle(chat)}
          </ThemedText>
          <ThemedText type="small" themeColor={unread ? 'text' : 'textSecondary'}>
            {shortTime(chat.lastMessageAt)}
          </ThemedText>
        </View>
        <View style={styles.line}>
          <ThemedText
            type="small"
            themeColor={unread ? 'text' : 'textSecondary'}
            numberOfLines={1}
            style={styles.flex}>
            {mine ? 'You: ' : sender}
            {previewOf(last) || (chat.kind === 'direct' ? 'Say hello' : 'No messages yet')}
          </ThemedText>
          {chat.muted ? <ThemedText type="small" themeColor="textSecondary">Muted</ThemedText> : null}
          {unread ? (
            <View style={[styles.badge, { backgroundColor: theme.accent }]}>
              <ThemedText type="smallBold" style={[styles.badgeText, { color: theme.onAccent }]}>
                {chat.unread > 99 ? '99+' : chat.unread}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, lineHeight: 14 },
});
