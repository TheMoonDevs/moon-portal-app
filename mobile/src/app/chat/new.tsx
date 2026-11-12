import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Avatar, Button, Field, QueryState, Screen, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, messageOf } from '@/lib/api';
import { queryClient } from '@/lib/query';
import type { ChatConversation, ChatPerson } from '@/lib/types';

type Mode = 'person' | 'group';

/** Start a chat with someone in your companies, or a group. */
export default function NewChatSheet() {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('person');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const contacts = useQuery({
    queryKey: ['chatContacts'],
    queryFn: () => api<{ contacts: ChatPerson[] }>('/api/chat/contacts'),
  });
  const words = search.trim().toLowerCase();
  const people = (contacts.data?.contacts ?? [])
    .filter(
      (p) =>
        !words ||
        (p.name ?? '').toLowerCase().includes(words) ||
        (p.username ?? '').toLowerCase().includes(words),
    )
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

  const open = (conversation: ChatConversation) => {
    void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    queryClient.setQueryData(['conversation', conversation.id], { conversation });
    router.dismiss();
    router.push({ pathname: '/chat/[id]', params: { id: conversation.id } });
  };

  const startWith = async (person: ChatPerson) => {
    setBusy(person.id);
    try {
      const res = await api<{ conversation: ChatConversation }>('/api/chat/conversations', {
        method: 'POST',
        body: { userId: person.id },
      });
      open(res.conversation);
    } catch (e) {
      Alert.alert('Couldn’t start the chat', messageOf(e));
    } finally {
      setBusy(null);
    }
  };

  const createGroup = async () => {
    setBusy('group');
    try {
      const res = await api<{ conversation: ChatConversation }>('/api/chat/groups', {
        method: 'POST',
        body: { name: name.trim(), memberIds: picked },
      });
      open(res.conversation);
    } catch (e) {
      Alert.alert('Couldn’t make the group', messageOf(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen edgeTop={false}>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'person', label: 'Person' },
          { value: 'group', label: 'New group' },
        ]}
      />
      {mode === 'group' ? (
        <>
          <Field value={name} onChangeText={setName} placeholder="Group name" maxLength={80} />
          <Button
            title={picked.length ? `Make group with ${picked.length}` : 'Pick people below'}
            busy={busy === 'group'}
            disabled={!name.trim() || !picked.length}
            onPress={() => void createGroup()}
          />
        </>
      ) : null}
      <Field
        value={search}
        onChangeText={setSearch}
        placeholder="Search people"
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      <QueryState
        loading={contacts.isPending}
        error={contacts.data ? null : contacts.error}
        onRetry={() => void contacts.refetch()}
        what="people"
      />
      <View>
        {people.map((p) => {
          const selected = picked.includes(p.id);
          return (
            <Pressable
              key={p.id}
              disabled={!!busy}
              onPress={() =>
                mode === 'group'
                  ? setPicked(selected ? picked.filter((id) => id !== p.id) : [...picked, p.id])
                  : void startWith(p)
              }
              style={({ pressed }) => [
                styles.row,
                { borderColor: theme.border, opacity: pressed || busy === p.id ? 0.6 : 1 },
              ]}>
              <Avatar uri={p.avatar} name={p.name} size={40} />
              <View style={styles.flex}>
                <ThemedText numberOfLines={1}>{p.name ?? p.username ?? 'Someone'}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {[p.positionTitle, p.companies?.join(', ')].filter(Boolean).join(' · ')}
                </ThemedText>
              </View>
              {mode === 'group' ? (
                <Icon
                  name={selected ? 'checkCircle' : 'circle'}
                  size={22}
                  color={selected ? theme.accent : theme.textSecondary}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
