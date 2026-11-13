import { useQuery } from '@tanstack/react-query';
import { type Href, router } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CompanyMark } from '@/components/company-mark';
import { StatusDot } from '@/components/status-dot';
import { ThemedText } from '@/components/themed-text';
import { Avatar, Field, Notice, Screen, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, withQuery } from '@/lib/api';
import { chatTitle, previewOf, useConversations } from '@/lib/chat';
import { timeAgo } from '@/lib/dates';
import { projectName } from '@/lib/project-name';
import { currentPick } from '@/lib/status';
import { statusLabel } from '@/lib/tasks';
import type { ChatMessage, MyTasks, ProjectsOverview } from '@/lib/types';

/*
 * One search for everything: the person's tasks, the projects they can see,
 * people, chats and the words inside chat messages. Tasks, projects, people
 * and chats are searched on the phone from what it already has; messages
 * are searched by the portal.
 */

const MAX = 6;

export default function SearchScreen() {
  const [search, setSearch] = useState('');
  const words = search.trim().toLowerCase();
  const typed = useDebounced(words, 300);

  const tasks = useQuery({ queryKey: ['tasks'], queryFn: () => api<MyTasks>('/api/me/tasks') });
  const overview = useQuery({
    queryKey: ['projectsOverview'],
    queryFn: () => api<ProjectsOverview>('/api/projects/overview'),
  });
  const conversations = useConversations();
  const messages = useQuery({
    queryKey: ['chatSearch', typed],
    queryFn: () => api<{ messages: ChatMessage[] }>(withQuery('/api/chat/search', { q: typed })),
    enabled: typed.length >= 2,
    staleTime: 30_000,
  });

  const has = (...texts: (string | null | undefined)[]) =>
    texts.some((t) => !!t && t.toLowerCase().includes(words));

  const companies = new Map((overview.data?.companies ?? []).map((c) => [c.id, c]));
  const projectsById = new Map((overview.data?.projects ?? []).map((p) => [p.id, p]));
  const taskProjects = new Map((tasks.data?.projects ?? []).map((p) => [p.id, p]));
  const chats = conversations.data?.conversations ?? [];
  const chatsById = new Map(chats.map((c) => [c.id, c]));

  const foundTasks = words
    ? [...(tasks.data?.tasks ?? []), ...(tasks.data?.archived ?? [])].filter((t) => has(t.title))
    : [];
  const foundProjects = words
    ? (overview.data?.projects ?? []).filter((p) =>
        has(projectName(p, companies.get(p.companyId)?.name), companies.get(p.companyId)?.name),
      )
    : [];
  const foundPeople = words
    ? (overview.data?.users ?? []).filter((u) => has(u.name, u.username, u.positionTitle))
    : [];
  const foundChats = words ? chats.filter((c) => has(chatTitle(c))) : [];
  const foundMessages = typed.length >= 2 && typed === words ? (messages.data?.messages ?? []) : [];

  const nothing =
    !!words &&
    !foundTasks.length &&
    !foundProjects.length &&
    !foundPeople.length &&
    !foundChats.length &&
    !foundMessages.length &&
    !messages.isFetching;

  return (
    <Screen edgeTop={false}>
      <Field
        value={search}
        onChangeText={setSearch}
        placeholder="Tasks, projects, people, chats"
        autoFocus
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {!words ? (
        <Notice title="Search everything" body="Your tasks, projects, people, chats and messages, in one place." />
      ) : null}
      {nothing ? <Notice title="Nothing found" body={`Nothing matches “${search.trim()}”.`} /> : null}

      <Group title="Tasks" count={foundTasks.length}>
        {foundTasks.slice(0, MAX).map((t) => {
          const pick = currentPick(t);
          const project = taskProjects.get(t.projectId) ?? projectsById.get(t.projectId);
          return (
            <Result
              key={t.id}
              href={{ pathname: '/task/[id]', params: { id: t.id } }}
              left={<StatusDot status={pick === 'archived' ? 'done' : pick} />}
              title={t.title}
              detail={[statusLabel(t), project ? projectName(project, companies.get(t.companyId)?.name) : null]
                .filter(Boolean)
                .join(' · ')}
            />
          );
        })}
      </Group>

      <Group title="Projects" count={foundProjects.length}>
        {foundProjects.slice(0, MAX).map((p) => {
          const company = companies.get(p.companyId);
          return (
            <Result
              key={p.id}
              href={{ pathname: '/project/[id]', params: { id: p.id } }}
              left={
                <CompanyMark
                  id={p.id}
                  name={projectName(p, company?.name)}
                  color={p.isCore ? (company?.color ?? p.color) : p.color}
                  logo={p.isCore ? company?.logo : p.logo}
                  size={32}
                />
              }
              title={projectName(p, company?.name)}
              detail={company?.name}
            />
          );
        })}
      </Group>

      <Group title="People" count={foundPeople.length}>
        {foundPeople.slice(0, MAX).map((u) => (
          <Result
            key={u.id}
            href={{ pathname: '/person/[id]', params: { id: u.id } }}
            left={<Avatar uri={u.avatar} name={u.name} size={32} />}
            title={u.name || u.username || 'Someone'}
            detail={u.positionTitle}
          />
        ))}
      </Group>

      <Group title="Chats" count={foundChats.length}>
        {foundChats.slice(0, MAX).map((c) => (
          <Result
            key={c.id}
            href={{ pathname: '/chat/[id]', params: { id: c.id } }}
            left={<Avatar uri={c.group?.avatar ?? c.partner.avatar} name={chatTitle(c)} size={32} />}
            title={chatTitle(c)}
            detail={c.lastMessage ? previewOf(c.lastMessage) : null}
          />
        ))}
      </Group>

      <Group title="Messages" count={foundMessages.length}>
        {foundMessages.slice(0, MAX * 2).map((m) => {
          const chat = chatsById.get(m.conversationId);
          return (
            <Result
              key={m.id}
              href={{ pathname: '/chat/[id]', params: { id: m.conversationId } }}
              left={
                <Avatar
                  uri={chat?.group?.avatar ?? chat?.partner.avatar}
                  name={chat ? chatTitle(chat) : null}
                  size={32}
                />
              }
              title={previewOf(m)}
              detail={[chat ? chatTitle(chat) : null, timeAgo(m.createdAt)].filter(Boolean).join(' · ')}
            />
          );
        })}
      </Group>
    </Screen>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (!count) return null;
  return (
    <View>
      <SectionTitle title={count > MAX ? `${title} · ${count}` : title} />
      {children}
    </View>
  );
}

function Result({
  href,
  left,
  title,
  detail,
}: {
  href: Href;
  left: ReactNode;
  title: string;
  detail?: string | null;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.row, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}>
      <View style={styles.left}>{left}</View>
      <View style={styles.flex}>
        <ThemedText numberOfLines={2}>{title}</ThemedText>
        {detail ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {detail}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

function useDebounced<T>(value: T, ms: number) {
  const [current, setCurrent] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setCurrent(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return current;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: { width: 32, alignItems: 'center' },
});
