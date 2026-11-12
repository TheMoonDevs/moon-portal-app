import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { CompanyMark } from '@/components/company-mark';
import { Icon } from '@/components/icon';
import { usePlaces } from '@/components/project-picker';
import { ThemedText } from '@/components/themed-text';
import { Avatar, Button, Field, QueryState, Screen, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, messageOf } from '@/lib/api';
import { isCoreProject, projectNameInCompany } from '@/lib/project-name';
import { queryClient } from '@/lib/query';
import type { ChatConversation, ChatPerson, ProjectRef } from '@/lib/types';

type Mode = 'person' | 'group';
type GroupFrom = 'people' | 'project';

/**
 * Start a chat with someone in your companies, or a group: of people you
 * pick, or a project's group (its team, opened the first time).
 */
export default function NewChatSheet() {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('person');
  const [from, setFrom] = useState<GroupFrom>('people');
  const { tabs } = usePlaces();
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

  const openProject = async (project: ProjectRef) => {
    setBusy(project.id);
    try {
      const res = await api<{ conversation: ChatConversation }>('/api/chat/projects', {
        method: 'POST',
        body: { projectId: project.id },
      });
      open(res.conversation);
    } catch (e) {
      Alert.alert('Couldn’t open the project chat', messageOf(e));
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
        <Segmented
          value={from}
          onChange={setFrom}
          options={[
            { value: 'people', label: 'Pick people' },
            { value: 'project', label: 'From a project' },
          ]}
        />
      ) : null}
      {mode === 'group' && from === 'project' ? (
        <View style={styles.projects}>
          <ThemedText type="small" themeColor="textSecondary">
            A project’s chat has its whole team. It opens if it already exists.
          </ThemedText>
          {tabs
            .filter((t) => !t.personal && t.projects.length)
            .map((t) => (
              <View key={t.key} style={styles.company}>
                <View style={styles.companyHead}>
                  <CompanyMark id={t.key} name={t.name} logo={t.logo} color={t.color} size={18} />
                  <ThemedText type="label" themeColor="textSecondary">
                    {t.name}
                  </ThemedText>
                </View>
                {t.projects.map((p) => (
                  <Pressable
                    key={p.id}
                    disabled={!!busy}
                    onPress={() => void openProject(p)}
                    style={({ pressed }) => [
                      styles.row,
                      { borderColor: theme.border, opacity: pressed || busy === p.id ? 0.6 : 1 },
                    ]}>
                    {isCoreProject(p) ? (
                      <CompanyMark id={t.key} name={t.name} color={t.color} logo={t.logo} size={40} />
                    ) : (
                      <CompanyMark id={p.id} name={p.name} color={p.color} logo={p.logo} size={40} />
                    )}
                    <ThemedText style={styles.flex} numberOfLines={1}>
                      {projectNameInCompany(p, t.name)}
                    </ThemedText>
                    <Icon name="chat" size={18} color={theme.textSecondary} />
                  </Pressable>
                ))}
              </View>
            ))}
        </View>
      ) : null}
      {mode === 'group' && from === 'people' ? (
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
      {mode === 'group' && from === 'project' ? null : (
        <>
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
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  projects: { gap: Spacing.three },
  company: { gap: 0 },
  companyHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingBottom: Spacing.one },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
