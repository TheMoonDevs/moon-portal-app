import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import * as Sharing from 'expo-sharing';
import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colorFor } from '@/components/company-mark';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Avatar, IconButton, Notice, QueryState } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useKeyboardRoom } from '@/hooks/use-keyboard-room';
import { useTheme } from '@/hooks/use-theme';
import { api, authHeaders, messageOf, portalUrl, withQuery } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { confirmBlock, confirmUnblock, REPORT_REASONS, sendReport, useBlockedIds } from '@/lib/blocks';
import {
  chatTitle,
  type MessagePage,
  type MessagePages,
  messagesKey,
  newClientId,
  previewOf,
  upsertMessage,
  useChat,
} from '@/lib/chat';
import { clock, dayTitle, timeAgo, todayKey } from '@/lib/dates';
import { mentionMatches, mentionQuery, mentionsIn, nameOf as personName, splitMentions } from '@/lib/mentions';
import { queryClient } from '@/lib/query';
import type { ChatConversation, ChatMessage, ChatPerson } from '@/lib/types';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const EDIT_WINDOW = 15 * 60 * 1000;

const dayOf = (iso: string) => todayKey(new Date(iso));
/** Their own text message, sent in the last 15 minutes. */
const canEdit = (m: ChatMessage, me: string) =>
  m.senderId === me &&
  m.kind === 'text' &&
  !m.deletedAt &&
  !m.pending &&
  Date.now() - new Date(m.createdAt).getTime() < EDIT_WINDOW;
const mediaUrl = (id: string, thumb = false) =>
  portalUrl(`/api/chat/media/${id}${thumb ? '?v=thumb' : ''}`);

/** One chat: messages newest at the bottom, live ticks and typing. */
export default function ChatScreen() {
  // `draft`: words shared from another app, ready to send.
  const { id, draft } = useLocalSearchParams<{ id: string; draft?: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  // The screen's real place on screen: clear of the header and the keyboard.
  const box = useRef<ComponentRef<typeof View>>(null);
  const room = useKeyboardRoom(box, headerHeight);
  const { profile } = useAuth();
  const me = profile?.id ?? '';
  const { live, setOpenChat, typingUserId, partnerOnline, notifyTyping } = useChat();

  const [text, setText] = useState(draft ?? '');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [acting, setActing] = useState<ChatMessage | null>(null);
  /** The long-pressed message can still be edited (15 minutes). */
  const [actingEditable, setActingEditable] = useState(false);
  const [viewing, setViewing] = useState<ChatMessage | null>(null);
  /** The message being reported: picking a reason. */
  const [reporting, setReporting] = useState<ChatMessage | null>(null);
  const blocked = useBlockedIds();

  const conversation = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => api<{ conversation: ChatConversation }>(`/api/chat/conversations/${id}`),
    // The chats list already has it: show that at once.
    initialData: () => {
      const list = queryClient.getQueryData<{ conversations: ChatConversation[] }>(['conversations']);
      const found = list?.conversations.find((c) => c.id === id);
      return found ? { conversation: found } : undefined;
    },
    initialDataUpdatedAt: 0,
  });
  const chat = conversation.data?.conversation;
  // In a group, "@" offers its members to name (lib/mentions.ts).
  const members = useMemo(() => chat?.group?.members ?? [], [chat?.group?.members]);
  const others = useMemo(() => members.filter((p) => p.id !== me), [members, me]);
  const memberNames = useMemo(() => members.map(personName).filter(Boolean), [members]);
  const typingMention = chat && chat.kind !== 'direct' && !editing ? mentionQuery(text) : null;
  const mentionChoices = typingMention ? mentionMatches(others, typingMention.query) : [];
  const pickMention = (p: ChatPerson) => {
    if (!typingMention) return;
    setText(`${text.slice(0, typingMention.start)}@${personName(p)} `);
  };

  const messages = useInfiniteQuery({
    queryKey: messagesKey(id),
    queryFn: ({ pageParam }) =>
      api<MessagePage>(
        withQuery(`/api/chat/conversations/${id}/messages`, { before: pageParam, limit: 40 }),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) =>
      last.hasMore ? (last.messages[last.messages.length - 1]?.createdAt ?? undefined) : undefined,
    refetchInterval: live ? false : 5_000,
  });
  // People the user blocked drop out at once (the server leaves them out too).
  const list = useMemo(
    () =>
      ((messages.data as MessagePages | undefined)?.pages.flatMap((p) => p.messages) ?? []).filter(
        (m) => m.kind === 'system' || m.senderId === me || !blocked.has(m.senderId),
      ),
    [messages.data, blocked, me],
  );

  // This chat is open: its pushes stay quiet and typing is live.
  useEffect(() => {
    if (!chat) return;
    setOpenChat({ conversationId: id, partnerId: chat.kind === 'direct' ? chat.partner.id : null });
    return () => setOpenChat(null);
  }, [id, chat?.kind, chat?.partner.id, chat, setOpenChat]);

  // Read: on open, and whenever someone else's message arrives.
  const newestFromOthers = list.find((m) => m.senderId !== me)?.id;
  useEffect(() => {
    if (!newestFromOthers) return;
    void api(`/api/chat/conversations/${id}/read`, { method: 'POST' })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['chatSummary'] });
        queryClient.setQueryData<{ conversations: ChatConversation[] }>(['conversations'], (data) =>
          data
            ? { conversations: data.conversations.map((c) => (c.id === id ? { ...c, unread: 0 } : c)) }
            : data,
        );
      })
      .catch(() => null);
  }, [id, newestFromOthers]);

  const send = async (message: ChatMessage) => {
    upsertMessage(id, { ...message, pending: 'sending' });
    try {
      const res = await api<{ message: ChatMessage }>(`/api/chat/conversations/${id}/messages`, {
        method: 'POST',
        body: {
          clientId: message.clientId,
          text: message.text,
          replyToId: message.replyTo?.id ?? null,
          mentions: message.mentions ?? [],
        },
      });
      upsertMessage(id, res.message);
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch {
      upsertMessage(id, { ...message, pending: 'failed' });
    }
  };

  const submit = async () => {
    const body = text.trim();
    if (!body) return;
    if (editing) {
      const target = editing;
      setEditing(null);
      setText('');
      try {
        const res = await api<{ message: ChatMessage }>(`/api/chat/messages/${target.id}`, {
          method: 'PATCH',
          body: { text: body },
        });
        upsertMessage(id, res.message);
      } catch (e) {
        Alert.alert('Couldn’t edit the message', messageOf(e));
      }
      return;
    }
    const clientId = newClientId();
    const message: ChatMessage = {
      id: `local-${clientId}`,
      conversationId: id,
      senderId: me,
      clientId,
      kind: 'text',
      text: body,
      mentions: mentionsIn(body, others),
      replyTo: replyTo
        ? { id: replyTo.id, senderId: replyTo.senderId, kind: replyTo.kind, text: previewOf(replyTo) }
        : null,
      reactions: [],
      createdAt: new Date().toISOString(),
    };
    setText('');
    setReplyTo(null);
    void Haptics.selectionAsync();
    await send(message);
  };

  const react = async (m: ChatMessage, emoji: string) => {
    setActing(null);
    const mine = m.reactions.find((r) => r.userId === me)?.emoji;
    const next = mine === emoji ? null : emoji;
    upsertMessage(id, {
      ...m,
      reactions: [
        ...m.reactions.filter((r) => r.userId !== me),
        ...(next ? [{ userId: me, emoji: next }] : []),
      ],
    });
    try {
      const res = await api<{ message: ChatMessage }>(`/api/chat/messages/${m.id}/react`, {
        method: 'POST',
        body: { emoji: next },
      });
      upsertMessage(id, res.message);
    } catch {
      upsertMessage(id, m);
    }
  };

  /** Take a message out of this chat on this phone. */
  const dropFromCache = (m: ChatMessage) =>
    queryClient.setQueryData<MessagePages>(messagesKey(id), (data) =>
      data
        ? {
            ...data,
            pages: data.pages.map((p) => ({ ...p, messages: p.messages.filter((x) => x.id !== m.id) })),
          }
        : data,
    );

  const remove = async (m: ChatMessage, scope: 'me' | 'everyone') => {
    setActing(null);
    try {
      const res = await api<{ message: ChatMessage }>(
        withQuery(`/api/chat/messages/${m.id}`, { for: scope }),
        { method: 'DELETE' },
      );
      if (scope === 'everyone') upsertMessage(id, res.message);
      else dropFromCache(m);
    } catch (e) {
      Alert.alert('Couldn’t delete the message', messageOf(e));
    }
  };

  /** A reason picked: report it, and block its sender if they say so. */
  const report = (m: ChatMessage, reason: string) => {
    setReporting(null);
    const name = nameOf(m.senderId);
    const go = async (alsoBlock: boolean) => {
      try {
        await sendReport(m.id, reason, alsoBlock);
        dropFromCache(m);
        Alert.alert(
          'Thanks for reporting',
          `Portal’s team will review it within a day.${alsoBlock ? ` You blocked ${name}.` : ''}`,
        );
      } catch (e) {
        Alert.alert('Couldn’t report the message', messageOf(e));
      }
    };
    Alert.alert('Report this message?', `Portal’s team reviews it and removes it if it breaks the rules. It’s hidden for you now.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', onPress: () => void go(false) },
      { text: `Report and block ${name.split(' ')[0]}`, style: 'destructive', onPress: () => void go(true) },
    ]);
  };

  const openFile = async (m: ChatMessage) => {
    try {
      const name = (m.attachment?.name || `file-${m.id}`).replace(/[/\\]/g, '_');
      const file = await File.downloadFileAsync(mediaUrl(m.id), new File(Paths.cache, name), {
        headers: authHeaders(),
        idempotent: true,
      });
      await Sharing.shareAsync(file.uri, { mimeType: m.attachment?.mime });
    } catch (e) {
      Alert.alert('Couldn’t open the file', messageOf(e));
    }
  };

  const nameOf = (userId: string) =>
    chat?.group?.members.find((p) => p.id === userId)?.name ??
    (chat?.partner.id === userId ? chat.partner.name : null) ??
    'Someone';

  const subtitle = !chat
    ? ''
    : typingUserId
      ? chat.kind === 'direct'
        ? 'typing…'
        : `${nameOf(typingUserId).split(' ')[0]} is typing…`
      : chat.kind === 'direct'
        ? partnerOnline
          ? 'Online'
          : chat.partnerLastSeenAt
            ? `Last seen ${timeAgo(chat.partnerLastSeenAt)}`
            : (chat.partner.positionTitle ?? '')
        : `${chat.group?.members.length ?? 0} people${chat.group?.companyName ? ` · ${chat.group.companyName}` : ''}`;

  const direct = chat?.kind === 'direct' ? chat.partner : null;
  const partnerBlocked = !!(chat?.kind === 'direct' && (chat.blocked || blocked.has(chat.partner.id)));

  // A direct chat's menu: their page, and block or unblock them.
  const more = () => {
    if (!direct) return;
    Alert.alert(direct.name ?? 'Chat', undefined, [
      { text: 'View profile', onPress: () => router.push({ pathname: '/person/[id]', params: { id: direct.id } }) },
      partnerBlocked
        ? { text: `Unblock ${direct.name ?? ''}`.trim(), onPress: () => confirmUnblock(direct) }
        : { text: `Block ${direct.name ?? ''}`.trim(), style: 'destructive', onPress: () => confirmBlock(direct) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View
      ref={box}
      onLayout={room.onLayout}
      style={[
        styles.flex,
        { backgroundColor: theme.chatBackground, paddingTop: room.top, paddingBottom: room.bottom },
      ]}>
      <Stack.Screen
        options={{
          // A solid header with no blur: messages never show through it.
          headerStyle: { backgroundColor: theme.backgroundElement },
          scrollEdgeEffects: { top: 'hidden', bottom: 'hidden', left: 'hidden', right: 'hidden' },
          headerRight: direct ? () => <IconButton name="ellipsis" label="Chat options" onPress={more} /> : undefined,
          headerTitle: () =>
            !chat ? (
              <ThemedText type="smallBold">Chat</ThemedText>
            ) : (
              <View style={styles.headerTitle}>
                <Avatar
                  uri={chat.group?.avatar ?? chat.partner.avatar}
                  name={chatTitle(chat)}
                  size={30}
                  online={chat.kind === 'direct' && partnerOnline}
                />
                <View>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {chatTitle(chat)}
                  </ThemedText>
                  {subtitle ? (
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {subtitle}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
            ),
        }}
      />
      <View style={styles.flex}>
        {messages.isPending || (messages.error && !messages.data) ? (
          <View style={styles.flex}>
            <QueryState
              loading={messages.isPending}
              error={messages.data ? null : messages.error}
              onRetry={() => void messages.refetch()}
              what="this chat"
            />
          </View>
        ) : (
          <FlatList
            inverted
            // Upside down, the system's automatic insets land on the wrong edge;
            // the screen pads itself instead.
            contentInsetAdjustmentBehavior="never"
            automaticallyAdjustKeyboardInsets={false}
            style={styles.flex}
            data={list}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (messages.hasNextPage && !messages.isFetchingNextPage) void messages.fetchNextPage();
            }}
            ListFooterComponent={
              messages.isFetchingNextPage ? <ActivityIndicator color={theme.textSecondary} /> : undefined
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                {partnerBlocked ? (
                  <Notice title="No messages to show" body="Messages from people you block are hidden." />
                ) : (
                  <Notice title="No messages yet" body="Say hello." />
                )}
              </View>
            }
            renderItem={({ item, index }) => {
              const older = list[index + 1];
              const newer = list[index - 1];
              const newDay = !older || dayOf(older.createdAt) !== dayOf(item.createdAt);
              const showName =
                chat?.kind !== 'direct' &&
                item.senderId !== me &&
                item.kind !== 'system' &&
                (newDay || older?.senderId !== item.senderId || older?.kind === 'system');
              const lastInRun = !newer || newer.senderId !== item.senderId || newer.kind === 'system';
              const firstInRun =
                newDay || !older || older.senderId !== item.senderId || older.kind === 'system';
              return (
                <View>
                  {newDay ? (
                    <View style={[styles.pill, { backgroundColor: theme.chatPill }]}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {dayTitle(dayOf(item.createdAt))}
                      </ThemedText>
                    </View>
                  ) : null}
                  <Bubble
                    message={item}
                    mine={item.senderId === me}
                    me={me}
                    group={chat?.kind !== 'direct'}
                    names={memberNames}
                    name={showName ? nameOf(item.senderId) : null}
                    replyName={item.replyTo ? (item.replyTo.senderId === me ? 'You' : nameOf(item.replyTo.senderId)) : null}
                    tail={lastInRun}
                    first={firstInRun}
                    onLongPress={() => {
                      if (item.kind === 'system' || item.deletedAt) return;
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setActingEditable(canEdit(item, me));
                      setActing(item);
                    }}
                    onRetry={() => void send(item)}
                    onOpen={() =>
                      item.kind === 'image' ? setViewing(item) : void openFile(item)
                    }
                  />
                </View>
              );
            }}
          />
        )}

        {replyTo || editing ? (
          <View style={[styles.replyBar, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
            <View style={[styles.replyEdge, { backgroundColor: theme.chatGreen }]} />
            <Icon name={editing ? 'pencil' : 'reply'} size={16} color={theme.textSecondary} />
            <View style={styles.flex}>
              <ThemedText type="smallBold">
                {editing ? 'Edit message' : `Reply to ${replyTo!.senderId === me ? 'yourself' : nameOf(replyTo!.senderId)}`}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {previewOf(editing ?? replyTo)}
              </ThemedText>
            </View>
            <Pressable
              hitSlop={10}
              onPress={() => {
                if (editing) setText('');
                setEditing(null);
                setReplyTo(null);
              }}>
              <Icon name="close" size={16} color={theme.textSecondary} />
            </Pressable>
          </View>
        ) : null}

        {mentionChoices.length ? (
          <View style={[styles.mentions, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
            {mentionChoices.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                onPress={() => pickMention(p)}
                style={({ pressed }) => [styles.mention, { opacity: pressed ? 0.6 : 1 }]}>
                <Avatar uri={p.avatar} name={personName(p)} size={28} />
                <ThemedText numberOfLines={1} style={styles.flex}>
                  {personName(p)}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}

        {partnerBlocked && direct ? (
          <View
            style={[
              styles.blockedBar,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundElement,
                paddingBottom: Math.max(insets.bottom, Spacing.three),
              },
            ]}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
              You blocked {direct.name ?? 'this person'}. Neither of you can message the other.
            </ThemedText>
            <ThemedText
              type="smallBold"
              themeColor="accent"
              accessibilityRole="button"
              onPress={() => confirmUnblock(direct)}>
              Unblock
            </ThemedText>
          </View>
        ) : (
        <View
          style={[
            styles.composer,
            {
              borderColor: theme.border,
              backgroundColor: theme.backgroundElement,
              // On the keyboard, no room for the home indicator.
              paddingBottom: room.bottom ? Spacing.two : Math.max(insets.bottom, Spacing.two),
            },
          ]}>
          <TextInput
            value={text}
            onChangeText={(value) => {
              setText(value);
              if (value) notifyTyping();
            }}
            placeholder="Message"
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={4000}
            style={[
              styles.input,
              { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            disabled={!text.trim()}
            onPress={() => void submit()}
            style={({ pressed }) => [
              styles.sendButton,
              { backgroundColor: theme.chatGreen, opacity: !text.trim() ? 0.45 : pressed ? 0.7 : 1 },
            ]}>
            <Icon name="paperplane" size={19} color="#fff" />
          </Pressable>
        </View>
        )}
      </View>

      {/* Long press: react, reply, copy, edit, delete. */}
      <Modal visible={!!acting} transparent animationType="fade" onRequestClose={() => setActing(null)}>
        <Pressable style={styles.backdrop} onPress={() => setActing(null)}>
          {acting ? (
            <View style={[styles.sheet, { backgroundColor: theme.backgroundElement, paddingBottom: insets.bottom + Spacing.three }]}>
              <View style={styles.reactions}>
                {REACTIONS.map((emoji) => (
                  <Pressable key={emoji} onPress={() => void react(acting, emoji)} style={styles.reaction}>
                    <ThemedText style={styles.emoji}>{emoji}</ThemedText>
                  </Pressable>
                ))}
              </View>
              <SheetRow
                title="Reply"
                onPress={() => {
                  setEditing(null);
                  setReplyTo(acting);
                  setActing(null);
                }}
              />
              {acting.text ? (
                <SheetRow
                  title="Copy text"
                  onPress={() => {
                    void Clipboard.setStringAsync(acting.text);
                    setActing(null);
                  }}
                />
              ) : null}
              {actingEditable ? (
                <SheetRow
                  title="Edit"
                  onPress={() => {
                    setReplyTo(null);
                    setEditing(acting);
                    setText(acting.text);
                    setActing(null);
                  }}
                />
              ) : null}
              {acting.senderId === me && !acting.pending ? (
                <SheetRow title="Delete for everyone" danger onPress={() => void remove(acting, 'everyone')} />
              ) : null}
              {!acting.pending ? (
                <SheetRow title="Delete for me" danger onPress={() => void remove(acting, 'me')} />
              ) : null}
              {acting.senderId !== me && !acting.pending ? (
                <>
                  <SheetRow
                    title="Report"
                    danger
                    onPress={() => {
                      setReporting(acting);
                      setActing(null);
                    }}
                  />
                  <SheetRow
                    title={`Block ${nameOf(acting.senderId).split(' ')[0]}`}
                    danger
                    onPress={() => {
                      const who = { id: acting.senderId, name: nameOf(acting.senderId) };
                      setActing(null);
                      confirmBlock(who);
                    }}
                  />
                </>
              ) : null}
            </View>
          ) : null}
        </Pressable>
      </Modal>

      {/* Report: why, then report (and block, if they want). */}
      <Modal visible={!!reporting} transparent animationType="fade" onRequestClose={() => setReporting(null)}>
        <Pressable style={styles.backdrop} onPress={() => setReporting(null)}>
          {reporting ? (
            <View style={[styles.sheet, { backgroundColor: theme.backgroundElement, paddingBottom: insets.bottom + Spacing.three }]}>
              <View style={styles.sheetHead}>
                <ThemedText type="smallBold">Why are you reporting this message?</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                  {previewOf(reporting)}
                </ThemedText>
              </View>
              {REPORT_REASONS.map((reason) => (
                <SheetRow key={reason} title={reason} onPress={() => report(reporting, reason)} />
              ))}
            </View>
          ) : null}
        </Pressable>
      </Modal>

      {/* A photo, full screen. */}
      <Modal visible={!!viewing} animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={styles.viewer}>
          {viewing ? (
            <Image
              source={{ uri: mediaUrl(viewing.id), headers: authHeaders() }}
              style={styles.flex}
              contentFit="contain"
            />
          ) : null}
          <Pressable
            onPress={() => setViewing(null)}
            hitSlop={12}
            style={[styles.viewerClose, { top: insets.top + Spacing.three }]}>
            <Icon name="close" size={24} color="#fff" />
          </Pressable>
          {viewing ? (
            <Pressable
              onPress={() => void openFile(viewing)}
              hitSlop={12}
              style={[styles.viewerShare, { top: insets.top + Spacing.three }]}>
              <Icon name="share" size={22} color="#fff" />
            </Pressable>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function SheetRow({ title, onPress, danger }: { title: string; onPress: () => void; danger?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.sheetRow, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}>
      <ThemedText themeColor={danger ? 'danger' : 'text'}>{title}</ThemedText>
    </Pressable>
  );
}

function Ticks({ message, group }: { message: ChatMessage; group: boolean }) {
  const theme = useTheme();
  if (message.pending === 'sending') return <Icon name="clock" size={11} color={theme.textSecondary} />;
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

function Bubble({
  message: m,
  mine,
  me,
  group,
  names,
  name,
  replyName,
  tail,
  first,
  onLongPress,
  onRetry,
  onOpen,
}: {
  message: ChatMessage;
  mine: boolean;
  me: string;
  group: boolean;
  /** The group's members' names, shown bold where they are @mentioned. */
  names: string[];
  name: string | null;
  replyName: string | null;
  /** The last of a run of messages from one person: space after it. */
  tail: boolean;
  /** The first of a run: the bubble's little tail. */
  first: boolean;
  onLongPress: () => void;
  onRetry: () => void;
  onOpen: () => void;
}) {
  const theme = useTheme();
  if (m.kind === 'system')
    return (
      <View style={[styles.pill, styles.system, { backgroundColor: theme.chatPill }]}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {previewOf(m)}
        </ThemedText>
      </View>
    );

  const ink = theme.text;
  const faint = theme.textSecondary;
  const fill = mine ? theme.bubbleMine : theme.bubbleTheirs;
  const counts = new Map<string, number>();
  for (const r of m.reactions) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
  const expired = !!m.attachment?.expiredAt;
  const ratio =
    m.attachment?.width && m.attachment?.height ? m.attachment.width / m.attachment.height : 4 / 3;

  return (
    <View style={[styles.bubbleRow, mine ? styles.right : styles.left, !tail && styles.tight]}>
      <Pressable
        onLongPress={onLongPress}
        onPress={m.pending === 'failed' ? onRetry : undefined}
        delayLongPress={300}
        style={[
          styles.bubble,
          {
            backgroundColor: fill,
            opacity: m.pending === 'sending' ? 0.7 : 1,
          },
          first && (mine ? styles.firstMine : styles.firstTheirs),
        ]}>
        {first ? (
          <View
            style={[
              styles.tail,
              mine
                ? { right: -7, borderTopColor: fill, borderRightWidth: 8 }
                : { left: -7, borderTopColor: fill, borderLeftWidth: 8 },
            ]}
          />
        ) : null}
        {name ? (
          <ThemedText type="smallBold" style={{ color: colorFor(m.senderId) }}>
            {name}
          </ThemedText>
        ) : null}
        {m.forwarded ? (
          <ThemedText type="small" style={[styles.italic, { color: faint }]}>
            Forwarded
          </ThemedText>
        ) : null}
        {m.replyTo ? (
          <View style={[styles.quote, { borderColor: theme.chatGreen, backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold" style={{ color: ink }}>
              {replyName}
            </ThemedText>
            <ThemedText type="small" numberOfLines={2} style={{ color: faint }}>
              {m.replyTo.text || (m.replyTo.kind === 'image' ? 'Photo' : m.replyTo.kind === 'file' ? 'File' : '')}
            </ThemedText>
          </View>
        ) : null}

        {m.deletedAt ? (
          <ThemedText style={[styles.italic, { color: faint }]}>This message was deleted</ThemedText>
        ) : (
          <>
            {m.kind === 'image' && m.attachment ? (
              expired ? (
                <ThemedText type="small" style={{ color: faint }}>
                  Photo removed after 90 days
                </ThemedText>
              ) : (
                <Pressable onPress={onOpen} onLongPress={onLongPress}>
                  <Image
                    source={{ uri: mediaUrl(m.id, true), headers: authHeaders() }}
                    style={[styles.photo, { aspectRatio: Math.max(0.6, Math.min(ratio, 1.8)) }]}
                    contentFit="cover"
                    transition={150}
                    recyclingKey={m.id}
                  />
                </Pressable>
              )
            ) : null}
            {(m.kind === 'video' || m.kind === 'file') && m.attachment ? (
              <Pressable
                onPress={expired ? undefined : onOpen}
                onLongPress={onLongPress}
                style={[styles.file, { borderColor: faint }]}>
                <Icon name={m.kind === 'video' ? 'video' : 'doc'} size={20} color={ink} />
                <View style={styles.flexShrink}>
                  <ThemedText type="smallBold" numberOfLines={1} style={{ color: ink }}>
                    {m.attachment.name}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: faint }}>
                    {expired ? 'Removed after 90 days' : `${Math.max(1, Math.round(m.attachment.size / 1024))} KB · tap to open`}
                  </ThemedText>
                </View>
              </Pressable>
            ) : null}
            {m.text ? (
              <ThemedText style={{ color: ink }}>
                {group
                  ? splitMentions(m.text, names).map((part, i) =>
                      part.mention ? (
                        <ThemedText key={i} style={[styles.mentionText, { color: theme.accent }]}>
                          {part.text}
                        </ThemedText>
                      ) : (
                        part.text
                      ),
                    )
                  : m.text}
              </ThemedText>
            ) : null}
          </>
        )}

        <View style={styles.meta}>
          {m.editedAt && !m.deletedAt ? (
            <ThemedText style={[styles.metaText, { color: faint }]}>edited</ThemedText>
          ) : null}
          <ThemedText style={[styles.metaText, { color: faint }]}>{clock(m.createdAt)}</ThemedText>
          {mine && !m.deletedAt && m.pending !== 'failed' ? <Ticks message={m} group={group} /> : null}
        </View>
      </Pressable>
      {m.pending === 'failed' ? (
        <ThemedText type="small" themeColor="danger">
          Not sent · tap to try again
        </ThemedText>
      ) : null}
      {counts.size ? (
        <View style={[styles.reactionRow, mine ? styles.right : styles.left]}>
          {Array.from(counts.entries()).map(([emoji, n]) => (
            <View
              key={emoji}
              style={[
                styles.reactionPill,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: m.reactions.some((r) => r.userId === me && r.emoji === emoji)
                    ? theme.chatGreen
                    : theme.border,
                },
              ]}>
              <ThemedText type="small">
                {emoji}
                {n > 1 ? ` ${n}` : ''}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, maxWidth: 260 },
  list: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, gap: 2, flexGrow: 1 },
  empty: { flex: 1, justifyContent: 'center', transform: [{ scaleY: -1 }] },
  pill: {
    alignSelf: 'center',
    borderRadius: 8,
    paddingHorizontal: Spacing.two + Spacing.one,
    paddingVertical: Spacing.one,
    marginVertical: Spacing.two + Spacing.one,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
  },
  center: { textAlign: 'center' },
  system: { maxWidth: '86%', marginVertical: Spacing.two },
  bubbleRow: { maxWidth: '80%', gap: 2, marginBottom: Spacing.two },
  tight: { marginBottom: 0 },
  left: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  right: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: {
    borderRadius: 10,
    paddingHorizontal: Spacing.two + 2,
    paddingTop: Spacing.one + 2,
    paddingBottom: Spacing.one,
    gap: 2,
    minWidth: 72,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
  },
  firstMine: { borderTopRightRadius: 0 },
  firstTheirs: { borderTopLeftRadius: 0 },
  tail: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderColor: 'transparent',
  },
  italic: { fontStyle: 'italic' },
  quote: {
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingLeft: Spacing.two,
    paddingVertical: Spacing.one,
    paddingRight: Spacing.two,
  },
  photo: { width: 220, borderRadius: Radius.medium },
  file: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    padding: Spacing.two,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, alignSelf: 'flex-end' },
  metaText: { fontSize: 11, lineHeight: 14, opacity: 0.8 },
  ticks: { fontSize: 11, lineHeight: 14, letterSpacing: -3, paddingRight: 3 },
  reactionRow: { flexDirection: 'row', gap: Spacing.one, marginTop: -Spacing.one },
  reactionPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
  },
  replyEdge: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  mentions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.one,
  },
  mention: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  mentionText: { fontWeight: '600' },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 140,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    paddingTop: Spacing.three,
  },
  reactions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  reaction: { padding: Spacing.one },
  emoji: { fontSize: 28, lineHeight: 36 },
  sheetRow: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetHead: { gap: Spacing.one, paddingHorizontal: Spacing.four, paddingBottom: Spacing.three },
  blockedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  viewer: { flex: 1, backgroundColor: '#000' },
  viewerClose: { position: 'absolute', left: Spacing.three },
  viewerShare: { position: 'absolute', right: Spacing.three },
});
