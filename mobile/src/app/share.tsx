import { Image } from 'expo-image';
import { router } from 'expo-router';
import { type ShareIntent, useShareIntentContext } from 'expo-share-intent';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Avatar, Card, Field, Notice, Screen, SectionTitle } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { messageOf } from '@/lib/api';
import { chatTitle, messagesKey, useConversations } from '@/lib/chat';
import { type LocalFile, sendFileToChat } from '@/lib/chat-upload';
import { queryClient } from '@/lib/query';

/*
 * Something shared from another app (text, a link or a photo): pick where it
 * goes. Text and links can start a task, a worklog or a chat message; a
 * photo is sent in a chat. components/entry-bridge.tsx opens this screen.
 */

type Shared = {
  text: string;
  url: string | null;
  title: string | null;
  file: LocalFile | null;
};

function sharedOf(intent: ShareIntent): Shared | null {
  const first = intent.files?.[0];
  const file: LocalFile | null = first?.path
    ? {
        uri: first.path,
        name: first.fileName || 'photo.jpg',
        mime: first.mimeType || 'image/jpeg',
        width: first.width ?? null,
        height: first.height ?? null,
      }
    : null;
  const text = (intent.text ?? '').trim();
  const url = intent.webUrl ?? null;
  const title = intent.meta?.title?.trim() || null;
  if (!text && !url && !file) return null;
  return { text, url, title, file };
}

/** The words a task, worklog or message starts with. */
const wordsOf = (s: Shared) => {
  if (s.title && s.url && !s.text.includes(s.title)) return `${s.title} ${s.url}`;
  return s.text || s.url || '';
};

export default function ShareScreen() {
  const theme = useTheme();
  const { shareIntent, resetShareIntent } = useShareIntentContext();
  const shared = sharedOf(shareIntent);
  const [choosingChat, setChoosingChat] = useState(false);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState<string | null>(null);
  const conversations = useConversations();

  // Leaving this screen clears what was shared, so the next share opens it
  // again. (The reset of the first render is the one that knows the share.)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => resetShareIntent(), []);

  if (!shared)
    return (
      <Screen edgeTop={false}>
        <Notice title="Nothing to share" body="Share text, a link or a photo from another app to send it here." />
      </Screen>
    );

  const words = wordsOf(shared).slice(0, 2000);
  const photo = !!shared.file && !words;

  const toChat = async (id: string) => {
    if (!shared.file) {
      router.replace({ pathname: '/chat/[id]', params: { id, draft: words } });
      return;
    }
    setSending(id);
    try {
      await sendFileToChat(id, shared.file, words);
      void queryClient.invalidateQueries({ queryKey: messagesKey(id) });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.replace({ pathname: '/chat/[id]', params: { id } });
    } catch (e) {
      Alert.alert('Couldn’t send the photo', messageOf(e));
      setSending(null);
    }
  };

  const query = search.trim().toLowerCase();
  const chats = (conversations.data?.conversations ?? [])
    .filter((c) => !c.archived)
    .filter((c) => !query || chatTitle(c).toLowerCase().includes(query))
    .slice(0, query ? 30 : 12);

  return (
    <Screen edgeTop={false}>
      <Card style={styles.preview}>
        {shared.file ? (
          <Image source={{ uri: shared.file.uri }} style={styles.photo} contentFit="cover" />
        ) : null}
        <View style={styles.flex}>
          {shared.title ? (
            <ThemedText type="smallBold" numberOfLines={2}>
              {shared.title}
            </ThemedText>
          ) : null}
          {shared.text || shared.url ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={6}>
              {shared.text || shared.url}
            </ThemedText>
          ) : (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {shared.file?.name}
            </ThemedText>
          )}
        </View>
      </Card>

      {!choosingChat ? (
        <View style={styles.choices}>
          {!photo ? (
            <>
              <Choice
                icon="add"
                title="New task"
                detail="Start a task with these words"
                onPress={() =>
                  router.replace({ pathname: '/new-task', params: { title: words.slice(0, 300) } })
                }
              />
              <Choice
                icon="pencil"
                title="Log work"
                detail="Add it to a task’s worklog"
                onPress={() => router.replace({ pathname: '/log', params: { text: words } })}
              />
            </>
          ) : null}
          <Choice
            icon="chat"
            title="Send in a chat"
            detail={photo ? 'Send the photo to a person or a group' : 'Write a message with it'}
            onPress={() => setChoosingChat(true)}
          />
        </View>
      ) : (
        <>
          <SectionTitle title="Send to" />
          <Field value={search} onChangeText={setSearch} placeholder="Search chats" autoFocus={false} />
          {chats.map((c) => (
            <Pressable
              key={c.id}
              disabled={!!sending}
              onPress={() => void toChat(c.id)}
              style={({ pressed }) => [
                styles.chat,
                { borderColor: theme.border, opacity: pressed || (sending && sending !== c.id) ? 0.6 : 1 },
              ]}>
              <Avatar uri={c.group?.avatar ?? c.partner.avatar} name={chatTitle(c)} size={40} />
              <ThemedText style={styles.flex} numberOfLines={1}>
                {chatTitle(c)}
              </ThemedText>
              {sending === c.id ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Sending…
                </ThemedText>
              ) : (
                <Icon name="chevron" size={14} color={theme.textSecondary} />
              )}
            </Pressable>
          ))}
          {!chats.length && !conversations.isPending ? (
            <ThemedText type="small" themeColor="textSecondary">
              No chats match.
            </ThemedText>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function Choice({
  icon,
  title,
  detail,
  onPress,
}: {
  icon: IconName;
  title: string;
  detail: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
      ]}>
      <View style={[styles.choiceIcon, { backgroundColor: theme.backgroundSelected }]}>
        <Icon name={icon} size={18} />
      </View>
      <View style={styles.flex}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      </View>
      <Icon name="chevron" size={14} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  preview: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  photo: { width: 64, height: 64, borderRadius: Radius.medium },
  choices: { gap: Spacing.two },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
  },
  choiceIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  chat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
