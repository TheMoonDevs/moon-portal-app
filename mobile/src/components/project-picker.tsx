import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useRef, useState } from 'react';
import { FlatList, type LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CompanyMark } from '@/components/company-mark';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { QueryState } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, withQuery } from '@/lib/api';
import { useCompany } from '@/lib/company';
import { todayKey } from '@/lib/dates';
import { isCoreProject, projectNameInCompany } from '@/lib/project-name';
import type { PlaceInput } from '@/lib/query';
import type { Day, ProjectRef, Workspace } from '@/lib/types';

type Tab = {
  key: string;
  name: string;
  logo?: string | null;
  color?: string | null;
  personal?: boolean;
  projects: ProjectRef[];
};

/** The projects a task can go in, one tab per company and Personal last. */
export function usePlaces() {
  const today = todayKey();
  const { company } = useCompany();
  const day = useQuery({
    queryKey: ['day', today],
    queryFn: () => api<Day>(withQuery('/api/me/day', { date: today })),
  });
  const workspace = useQuery({
    queryKey: ['workspace'],
    queryFn: () => api<Workspace>('/api/workspace'),
  });
  const projects = day.data?.projects ?? [];
  const companyOf = (id: string) => workspace.data?.companies.find((c) => c.company.id === id)?.company;
  const tabs: Tab[] = (day.data?.companies ?? [])
    .filter((c) => !c.isPersonal)
    .map((c) => ({
      key: c.id,
      name: c.name,
      logo: companyOf(c.id)?.logo,
      color: companyOf(c.id)?.color,
      // The company's general work first.
      projects: projects
        .filter((p) => p.companyId === c.id && !p.isPersonal)
        .sort((a, b) => Number(isCoreProject(b)) - Number(isCoreProject(a))),
    }))
    .filter((t) => t.projects.length)
    // The company on view first.
    .sort((a, b) => Number(b.key === company?.id) - Number(a.key === company?.id));
  tabs.push({
    key: 'personal',
    name: 'Personal',
    personal: true,
    projects: projects.filter((p) => p.isPersonal),
  });
  return { tabs, projects, query: day };
}

/**
 * Pick where a task goes: companies as tabs along the top (swipe between
 * them), each with its projects, and Personal for private work.
 */
export function ProjectPicker({
  selected,
  onPick,
}: {
  /** The picked project's id, or `personal`. */
  selected?: string | null;
  onPick: (place: PlaceInput, project: ProjectRef | null) => void;
}) {
  const theme = useTheme();
  const { tabs, projects, query } = usePlaces();
  const [width, setWidth] = useState(0);
  // The tab of the picked project, else the first.
  const personalPicked =
    selected === 'personal' || projects.some((p) => p.isPersonal && p.id === selected);
  const startTab = Math.max(
    0,
    tabs.findIndex((t) => (personalPicked ? t.personal : t.projects.some((p) => p.id === selected))),
  );
  // Until a tab is tapped or swiped to, the picked project's tab.
  const [picked, setTab] = useState<number | null>(null);
  const tab = picked ?? startTab;
  const pager = useRef<FlatList<Tab>>(null);

  const goTo = (i: number) => {
    setTab(i);
    pager.current?.scrollToIndex({ index: i, animated: true });
  };

  // One outer view while loading and after, so its width is measured once it mounts.
  const measure = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (!query.data)
    return (
      <View style={styles.flex} onLayout={measure}>
        <View style={styles.pad}>
          <QueryState
            loading={query.isPending}
            error={query.error}
            onRetry={() => void query.refetch()}
            what="your projects"
          />
        </View>
      </View>
    );

  return (
    <View style={styles.flex} onLayout={measure}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsRow}
        contentContainerStyle={styles.tabs}>
        {tabs.map((t, i) => {
          const on = i === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => goTo(i)}
              style={({ pressed }) => [
                styles.tab,
                {
                  backgroundColor: on ? theme.accent : theme.backgroundElement,
                  borderColor: on ? theme.accent : theme.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <CompanyMark id={t.key} name={t.name} logo={t.logo} color={t.color} personal={t.personal} size={20} />
              <ThemedText type="smallBold" style={on && { color: theme.onAccent }}>
                {t.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
      {width ? (
        <FlatList
          ref={pager}
          data={tabs}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(t) => t.key}
          initialScrollIndex={startTab}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / width);
            if (i !== tab && tabs[i]) setTab(i);
          }}
          style={styles.flex}
          renderItem={({ item }) => (
            <ScrollView style={{ width }} contentContainerStyle={styles.page}>
              {item.personal ? (
                <PlaceRow
                  mark={<CompanyMark id="personal" name="Personal" personal size={40} />}
                  title="Personal"
                  detail="Your own work. Only you see it."
                  on={personalPicked}
                  onPress={() => onPick({ personal: true }, projects.find((p) => p.isPersonal) ?? null)}
                />
              ) : (
                item.projects.map((p) => (
                  <PlaceRow
                    key={p.id}
                    mark={
                      isCoreProject(p) ? (
                        <CompanyMark id={item.key} name={item.name} color={item.color} logo={item.logo} size={40} />
                      ) : (
                        <CompanyMark id={p.id} name={p.name} color={p.color} logo={p.logo} size={40} />
                      )
                    }
                    title={projectNameInCompany(p, item.name)}
                    detail={
                      isCoreProject(p)
                        ? 'The company’s general work'
                        : p.goals?.length
                          ? `${p.goals.length} goal${p.goals.length === 1 ? '' : 's'}`
                          : item.name
                    }
                    on={selected === p.id}
                    onPress={() => onPick({ projectId: p.id }, p)}
                  />
                ))
              )}
            </ScrollView>
          )}
        />
      ) : null}
    </View>
  );
}

function PlaceRow({
  mark,
  title,
  detail,
  on,
  onPress,
}: {
  mark: ReactNode;
  title: string;
  detail?: string;
  on: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: on ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: on ? theme.accent : theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      {mark}
      <View style={styles.flex}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {title}
        </ThemedText>
        {detail ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {detail}
          </ThemedText>
        ) : null}
      </View>
      {on ? <Icon name="checkCircle" size={22} color={theme.accent} /> : <Icon name="forward" size={14} color={theme.textSecondary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: Spacing.three },
  tabsRow: { flexGrow: 0 },
  tabs: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: Spacing.one + 2,
    paddingRight: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  page: { padding: Spacing.three, gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
