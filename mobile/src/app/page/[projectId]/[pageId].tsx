import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { Button, Field, IconButton, QueryState, Row, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, messageOf } from '@/lib/api';
import { timeAgo } from '@/lib/dates';
import { openWebsite } from '@/lib/links';
import { queryClient } from '@/lib/query';
import type { ProjectPage } from '@/lib/types';

/**
 * A project page: read it, edit it, or (`new` as the page) write a new one,
 * an idea. The body is edited as Markdown, which the portal turns into the
 * same page the website's editor shows: headings, lists, to-dos, quotes and
 * the rest, with blocks Markdown can't write kept as small tags.
 */
export default function PageScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{
    projectId: string;
    pageId: string;
    parentId?: string;
    title?: string;
  }>();
  const { projectId, pageId } = params;
  const isNew = pageId === 'new';
  const query = useQuery({
    queryKey: ['page', projectId, pageId],
    queryFn: () => api<{ page: ProjectPage }>(`/api/projects/${projectId}/pages/${pageId}`),
    enabled: !isNew,
  });
  // The pages inside this one, from the project's list.
  const pages = useQuery({
    queryKey: ['project', projectId, 'pages'],
    queryFn: () =>
      api<{ objective: ProjectPage | null; pages: ProjectPage[] }>(`/api/projects/${projectId}/pages`),
  });
  const page = query.data?.page;
  const inside = (pages.data?.pages ?? []).filter((p) => p.parentId === pageId);
  const open = (id: string) =>
    router.push({ pathname: '/page/[projectId]/[pageId]', params: { projectId, pageId: id } });

  // Editing: null while reading.
  const [draft, setDraft] = useState<{ title: string; body: string } | null>(
    isNew ? { title: params.title ?? '', body: '' } : null,
  );
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const startEditing = async () => {
    if (!page) return;
    setLoadingDraft(true);
    try {
      const res = await api<{ page: ProjectPage; markdown?: string }>(
        `/api/projects/${projectId}/pages/${pageId}?format=markdown`,
      );
      setDraft({ title: res.page.title ?? '', body: res.markdown ?? '' });
    } catch (e) {
      Alert.alert('Couldn’t open the page to edit', messageOf(e));
    } finally {
      setLoadingDraft(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      if (isNew) {
        const res = await api<{ page: ProjectPage }>(`/api/projects/${projectId}/pages`, {
          method: 'POST',
          body: {
            kind: 'IDEA',
            title: draft.title.trim(),
            markdown: draft.body,
            ...(params.parentId && { parentId: params.parentId }),
          },
        });
        void queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        router.replace({ pathname: '/page/[projectId]/[pageId]', params: { projectId, pageId: res.page.id } });
        return;
      }
      const res = await api<{ page: ProjectPage }>(`/api/projects/${projectId}/pages/${pageId}`, {
        method: 'PATCH',
        body: { title: draft.title.trim(), markdown: draft.body },
      });
      queryClient.setQueryData(['page', projectId, pageId], { page: res.page });
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setDraft(null);
    } catch (e) {
      Alert.alert('Couldn’t save the page', messageOf(e));
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (isNew) router.back();
    else setDraft(null);
  };

  /** Puts Markdown in at the cursor: a line start (heading, list) or around the words (bold). */
  const format = (kind: 'h1' | 'h2' | 'bullet' | 'todo' | 'quote' | 'bold' | 'italic') => {
    if (!draft) return;
    const { body } = draft;
    const { start, end } = selection;
    if (kind === 'bold' || kind === 'italic') {
      const mark = kind === 'bold' ? '**' : '*';
      const words = body.slice(start, end) || (kind === 'bold' ? 'bold' : 'italic');
      const next = `${body.slice(0, start)}${mark}${words}${mark}${body.slice(end)}`;
      setDraft({ ...draft, body: next });
      return;
    }
    const prefix = { h1: '# ', h2: '## ', bullet: '- ', todo: '- [ ] ', quote: '> ' }[kind];
    const lineStart = body.lastIndexOf('\n', start - 1) + 1;
    const next = `${body.slice(0, lineStart)}${prefix}${body.slice(lineStart)}`;
    setDraft({ ...draft, body: next });
    setSelection({ start: start + prefix.length, end: end + prefix.length });
  };

  const title = isNew ? 'New page' : (page?.title ?? '');

  return (
    <Screen
      edgeTop={false}
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="interactive"
      refreshControl={
        draft ? undefined : (
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
        )
      }>
      <Stack.Screen
        options={{
          title: draft ? (isNew ? 'New page' : 'Edit page') : title,
          headerLeft: draft
            ? () => (
                <Pressable hitSlop={10} onPress={cancel}>
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
              )
            : undefined,
          headerRight: () =>
            draft ? (
              <Pressable hitSlop={10} disabled={saving} onPress={() => void save()}>
                <ThemedText type="smallBold" style={{ opacity: saving ? 0.5 : 1 }}>
                  {saving ? 'Saving…' : 'Save'}
                </ThemedText>
              </Pressable>
            ) : page ? (
              <IconButton name="pencil" label="Edit page" onPress={() => void startEditing()} />
            ) : null,
        }}
      />

      {draft ? (
        <>
          <Field
            value={draft.title}
            onChangeText={(t) => setDraft({ ...draft, title: t })}
            placeholder={isNew ? 'Name the idea' : 'Title'}
            autoFocus={isNew}
            maxLength={200}
            style={styles.titleField}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            contentContainerStyle={styles.toolbar}>
            {(
              [
                ['h1', 'H1'],
                ['h2', 'H2'],
                ['bullet', '•  List'],
                ['todo', '☐  To-do'],
                ['quote', '❝'],
                ['bold', 'B'],
                ['italic', 'I'],
              ] as const
            ).map(([kind, label]) => (
              <Pressable
                key={kind}
                onPress={() => format(kind)}
                style={({ pressed }) => [
                  styles.tool,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
                ]}>
                <ThemedText type="smallBold" style={[kind === 'italic' && styles.italic]}>
                  {label}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
          <TextInput
            value={draft.body}
            onChangeText={(t) => setDraft({ ...draft, body: t })}
            onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
            placeholder={'Write it down…\n\n# A heading\n- a point\n- [ ] something to do'}
            placeholderTextColor={theme.textSecondary}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
            style={[
              styles.body,
              { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}
          />
          <ThemedText type="small" themeColor="textSecondary">
            Written in Markdown: # for a heading, - for a point, - [ ] for a to-do, **bold**. It shows as a
            page on the website too.
          </ThemedText>
        </>
      ) : (
        <>
          <QueryState
            loading={query.isPending || loadingDraft}
            error={query.data ? null : query.error}
            onRetry={() => void query.refetch()}
            what="this page"
          />
          {page ? (
            <>
              <View style={styles.head}>
                <ThemedText type="title">
                  {page.emoji ? `${page.emoji} ` : ''}
                  {page.title || (page.kind === 'OBJECTIVE' ? 'Objective' : 'Untitled')}
                </ThemedText>
                {page.updatedAt ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Edited {timeAgo(page.updatedAt)}
                  </ThemedText>
                ) : null}
              </View>
              <Pressable onLongPress={() => void startEditing()}>
                <RichText doc={page.content} onOpenPage={open} />
              </Pressable>
              <Button
                title="Edit this page"
                kind="secondary"
                busy={loadingDraft}
                onPress={() => void startEditing()}
              />
              {inside.length ? (
                <View>
                  <ThemedText type="label" themeColor="textSecondary">
                    Pages inside
                  </ThemedText>
                  {inside.map((p) => (
                    <Row
                      key={p.id}
                      icon="page"
                      title={`${p.emoji ? `${p.emoji} ` : ''}${p.title || 'Untitled'}`}
                      chevron
                      onPress={() => open(p.id)}
                    />
                  ))}
                </View>
              ) : null}
              {page.kind === 'IDEA' ? (
                <Row
                  icon="add"
                  title="Add a page inside"
                  onPress={() =>
                    router.push({
                      pathname: '/page/[projectId]/[pageId]',
                      params: { projectId, pageId: 'new', parentId: page.id },
                    })
                  }
                />
              ) : null}
              <Row
                icon="globe"
                title="Open on the website"
                chevron
                onPress={() => openWebsite(`/projects/${projectId}?view=pages&page=${pageId}`)}
              />
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: Spacing.one },
  titleField: { fontSize: 20, fontWeight: 700 },
  toolbar: { flexDirection: 'row', gap: Spacing.two },
  tool: {
    minWidth: 40,
    alignItems: 'center',
    borderRadius: Radius.small,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 2,
  },
  italic: { fontStyle: 'italic' },
  body: {
    minHeight: 280,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    fontSize: 16,
    lineHeight: 23,
  },
});
