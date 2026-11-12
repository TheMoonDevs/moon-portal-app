import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { OfflineBanner } from '@/components/offline-banner';
import { ThemedText } from '@/components/themed-text';
import { Avatar, Notice, QueryState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { chatTitle, previewOf, useConversations } from '@/lib/chat';
import { shortTime } from '@/lib/dates';
import type { ChatConversation, ChatMessage } from '@/lib/types';

type Filter = 'all' | 'unread' | 'groups' | 'projects';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'groups', label: 'Groups' },
  { value: 'projects', label: 'Projects' },
];

/** Chats, newest first, laid out the way WhatsApp does. */
export default function ChatsScreen() {
  const theme = useTheme();
  const query = useConversations();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const words = search.trim().toLowerCase();

  const all = (query.data?.conversations ?? []).filter((c) => !c.archived);
  const unread = all.filter((c) => c.unread > 0).length;
  const shown = all
    .filter((c) =>
      filter === 'unread'
        ? c.unread > 0
        : filter === 'groups'
          ? c.kind === 'group'
          : filter === 'projects'
            ? c.kind === 'project'
            : true,
    )
    .filter((c) => !words || chatTitle(c).toLowerCase().includes(words))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <Screen
      contentContainerStyle={styles.screen}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }>
      <View style={styles.padded}>
        <View style={styles.top}>
          <ThemedText type="title" style={styles.flex}>
            Chats
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New chat"
            hitSlop={8}
            onPress={() => router.push('/chat/new')}
            style={({ pressed }) => [styles.newChat, { backgroundColor: theme.chatGreen, opacity: pressed ? 0.7 : 1 }]}>
            <Icon name="add" size={18} color="#fff" />
          </Pressable>
        </View>
        <OfflineBanner />
        <View style={[styles.search, { backgroundColor: theme.backgroundSelected }]}>
          <Icon name="search" size={16} color={theme.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.text }]}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((f) => {
          const on = f.value === filter;
          return (
            <Pressable
              key={f.value}
              onPress={() => setFilter(f.value)}
              style={[styles.filter, { backgroundColor: on ? theme.chipOn : theme.backgroundSelected }]}>
              <ThemedText type="smallBold" style={{ color: on ? theme.chipOnText : theme.textSecondary }}>
                {f.label}
                {f.value === 'unread' && unread ? ` ${unread}` : ''}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
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
        {shown.map((c, i) => (
          <ChatRow key={c.id} chat={c} last={i === shown.length - 1} />
        ))}
      </View>
    </Screen>
  );
}

/** ✓, ✓✓ or blue ✓✓ on your own last message. */
function Ticks({ message, group }: { message: ChatMessage; group: boolean }) {
  const theme = useTheme();
  if (message.pending === 'sending') return <Icon name="clock" size={12} color={theme.textSecondary} />;
  const read = group
    ? !!message.recipientCount && (message.readCount ?? 0) >= message.recipientCount
    : !!message.readAt;
  const delivered = read || !!message.deliveredAt;
  return (
    <ThemedText style={[styles.ticks, { color: read ? theme.tickRead : theme.textSecondary }]}>
      {delivered ? '✓✓' : '✓'}
    </ThemedText>
  );
}

function ChatRow({ chat, last }: { chat: ChatConversation; last: boolean }) {
  const theme = useTheme();
  const { profile } = useAuth();
  const message = chat.lastMessage;
  const mine = !!message && message.senderId === profile?.id && message.kind !== 'system';
  const sender =
    chat.kind !== 'direct' && message && !mine && message.kind !== 'system'
      ? `${chat.group?.members.find((m) => m.id === message.senderId)?.name?.split(' ')[0] ?? 'Someone'}: `
      : '';
  const unread = chat.unread > 0;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/chat/[id]', params: { id: chat.id } })}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.backgroundSelected }]}>
      <Avatar uri={chat.group?.avatar ?? chat.partner.avatar} name={chatTitle(chat)} size={52} />
      <View
        style={[
          styles.rowBody,
          !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
        ]}>
        <View style={styles.line}>
          <ThemedText style={[styles.name, styles.flex]} numberOfLines={1}>
            {chatTitle(chat)}
          </ThemedText>
          <ThemedText
            type="small"
            style={[styles.time, { color: unread ? theme.chatGreen : theme.textSecondary }]}>
            {shortTime(chat.lastMessageAt)}
          </ThemedText>
        </View>
        <View style={styles.line}>
          <View style={[styles.flex, styles.preview]}>
            {mine && message ? <Ticks message={message} group={chat.kind !== 'direct'} /> : null}
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.flexShrink}>
              {sender}
              {previewOf(message) || (chat.kind === 'direct' ? 'Say hello' : 'No messages yet')}
            </ThemedText>
          </View>
          {chat.muted ? <Icon name="muted" size={14} color={theme.textSecondary} /> : null}
          {chat.pinned ? <Icon name="pin" size={14} color={theme.textSecondary} /> : null}
          {unread ? (
            <View style={[styles.badge, { backgroundColor: theme.chatBadge }]}>
              <ThemedText style={styles.badgeText}>{chat.unread > 99 ? '99+' : chat.unread}</ThemedText>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  screen: { paddingHorizontal: 0, gap: Spacing.two },
  padded: { paddingHorizontal: Spacing.three, gap: Spacing.three },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  newChat: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 10,
    paddingHorizontal: Spacing.two + Spacing.one,
    height: 38,
  },
  searchInput: { flex: 1, fontSize: 17, paddingVertical: 0 },
  filters: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  filter: { borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingLeft: Spacing.three },
  rowBody: { flex: 1, gap: 2, paddingVertical: Spacing.two + Spacing.one, paddingRight: Spacing.three },
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  name: { fontSize: 17, lineHeight: 22, fontWeight: 600 },
  time: { fontSize: 13 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ticks: { fontSize: 12, lineHeight: 16, letterSpacing: -3, paddingRight: 3 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, lineHeight: 15, fontWeight: 700 },
});
