import { useMutation, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Notice, QueryState, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, messageOf, portalUrl } from '@/lib/api';
import { bannerOf, pickKit } from '@/lib/brand';
import { isCoreProject, useCompanyLookup } from '@/lib/project-name';
import { queryClient } from '@/lib/query';
import type { ProjectDetail } from '@/lib/types';

/**
 * The project's leads pick the image at the top of its page from the brand
 * kit's images (the company's kit for its core project), or go back to the
 * kit's own banner.
 */
export default function HeaderImageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const companyOf = useCompanyLookup();
  const query = useQuery({
    queryKey: ['project', id],
    queryFn: () => api<ProjectDetail>(`/api/projects/${id}`),
  });
  const project = query.data?.project;
  const company = companyOf(project?.companyId);
  const kit = pickKit(project?.brandKit, isCoreProject(project) ? company?.brandKit : null);
  const images = (kit?.assets ?? []).filter((a) => a.kind === 'image');
  const current = project?.headerImage ?? null;

  const save = useMutation({
    mutationFn: (image: string | null) =>
      api<{ project: { headerImage?: string | null } }>(`/api/projects/${id}/header`, {
        method: 'PUT',
        body: { image },
      }),
    onSuccess: (res) => {
      queryClient.setQueryData<ProjectDetail>(['project', id], (d) =>
        d ? { ...d, project: { ...d.project, headerImage: res.project.headerImage ?? null } } : d,
      );
      router.back();
    },
    onError: (e) => Alert.alert('Couldn’t change the header', messageOf(e)),
  });

  const fallback = bannerOf(kit);
  const options = [
    { key: 'default', url: null as string | null, preview: fallback, label: 'Brand default' },
    ...images.map((a) => ({ key: a.url, url: a.url as string | null, preview: a.url, label: a.label })),
  ];

  return (
    <Screen edgeTop={false}>
      <QueryState
        loading={query.isPending}
        error={query.data ? null : query.error}
        onRetry={() => void query.refetch()}
        what="this project"
      />
      {project && !images.length ? (
        <Notice
          title="No images in the brand kit yet"
          body="Add banners or other images to the project's brand kit on the website, then pick one here."
        />
      ) : null}
      {project && images.length ? (
        <View style={styles.grid}>
          {options.map((o) => {
            const selected = o.url === current;
            return (
              <Pressable
                key={o.key}
                disabled={save.isPending}
                onPress={() => (selected ? router.back() : save.mutate(o.url))}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [styles.option, { opacity: pressed || save.isPending ? 0.7 : 1 }]}>
                <View
                  style={[
                    styles.preview,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: selected ? theme.accent : theme.border,
                      borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                    },
                  ]}>
                  {o.preview ? (
                    <Image source={{ uri: portalUrl(o.preview) }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary">
                      The brand colours
                    </ThemedText>
                  )}
                  {selected ? (
                    <View style={[styles.check, { backgroundColor: theme.accent }]}>
                      <Icon name="check" size={14} color={theme.onAccent} />
                    </View>
                  ) : null}
                </View>
                <ThemedText type={selected ? 'smallBold' : 'small'} numberOfLines={1}>
                  {o.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { gap: Spacing.three },
  option: { gap: Spacing.one },
  preview: {
    width: '100%',
    aspectRatio: 3.2,
    borderRadius: Radius.large,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
