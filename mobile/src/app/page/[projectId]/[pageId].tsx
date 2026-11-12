import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { Button, QueryState, Row, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/dates';
import { openWebsite } from '@/lib/links';
import type { ProjectPage } from '@/lib/types';

/** A project page, to read. Editing is on the website. */
export default function PageScreen() {
  const { projectId, pageId } = useLocalSearchParams<{ projectId: string; pageId: string }>();
  const query = useQuery({
    queryKey: ['page', projectId, pageId],
    queryFn: () => api<{ page: ProjectPage }>(`/api/projects/${projectId}/pages/${pageId}`),
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

  return (
    <Screen
      edgeTop={false}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }>
      <Stack.Screen options={{ title: page?.title ?? '' }} />
      <QueryState
        loading={query.isPending}
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
          <RichText doc={page.content} onOpenPage={open} />
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
          <Button
            title="Edit on the website"
            kind="secondary"
            onPress={() => openWebsite(`/projects/${projectId}?view=pages&page=${pageId}`)}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: Spacing.one },
});
