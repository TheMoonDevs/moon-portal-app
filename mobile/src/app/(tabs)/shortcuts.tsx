import { type Href, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useChatUnread } from '@/lib/chat';
import { openWebsite } from '@/lib/links';
import { unreadCount, useNotifications } from '@/lib/notifications';
import { countShortcut, useTopShortcuts } from '@/lib/shortcut-usage';

type Item = {
  title: string;
  /** A short name for the quick links at the top. */
  short?: string;
  icon: IconName;
  /** The square's colour, as the system apps use. */
  color: string;
  open: Href | (() => void);
  detail?: string | null;
  /** Other words it is found by. */
  words?: string;
};

/** The quick links before the person has used any: the everyday four. */
const QUICK_DEFAULTS = ['Log work', 'Add a task', 'Chats', 'Projects'];

const openItem = (item: Item) => {
  void countShortcut(item.title);
  if (typeof item.open === 'function') item.open();
  else router.push(item.open);
};

/**
 * Every part of the app in one list, like the phone's Settings, with the
 * four the person uses most as big icons at the top.
 */
export default function ShortcutsScreen() {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const unread = unreadCount(useNotifications().data);
  const chats = useChatUnread().data?.unread ?? 0;

  const groups: { title: string; items: Item[] }[] = [
    {
      title: 'Today',
      items: [
        { title: 'Log work', icon: 'pencil', color: '#ff9500', open: '/log', words: 'update point' },
        { title: 'Add a task', short: 'Add task', icon: 'add', color: '#007aff', open: '/new-task', words: 'new todo' },
        { title: 'Today’s worklog', short: 'Worklog', icon: 'checklist', color: '#34c759', open: '/work', words: 'day plan' },
        { title: 'All my tasks', short: 'My tasks', icon: 'checkCircle', color: '#30b0c7', open: '/tasks', words: 'open waiting archived' },
        {
          title: 'Notifications',
          short: 'Alerts',
          icon: 'bell',
          color: '#ff3b30',
          open: '/notifications',
          detail: unread ? String(unread) : null,
          words: 'alerts',
        },
      ],
    },
    {
      title: 'Projects',
      items: [
        { title: 'Projects', icon: 'folder', color: '#5856d6', open: '/projects', words: 'pages team' },
        { title: 'Goals', icon: 'target', color: '#ff2d55', open: '/goals', words: 'targets ticks' },
        { title: 'Plans', icon: 'map', color: '#00c7be', open: '/plans', words: 'steps ideas' },
      ],
    },
    {
      title: 'People',
      items: [
        {
          title: 'Chats',
          icon: 'chat',
          color: '#25d366',
          open: '/messages',
          detail: chats ? String(chats) : null,
          words: 'messages',
        },
        { title: 'New chat or group', short: 'New chat', icon: 'plusBubble', color: '#32ade6', open: '/chat/new', words: 'message' },
        { title: 'Leaderboard', icon: 'trophy', color: '#ffcc00', open: '/leaderboard', words: 'points rank' },
      ],
    },
    {
      title: 'Meetings',
      items: [
        {
          title: 'Meetings',
          icon: 'video',
          color: '#ff3b30',
          open: '/meetings',
          detail: 'Booking link',
          words: 'calls bookings calendar',
        },
      ],
    },
    {
      title: 'You',
      items: [
        {
          title: 'My page',
          icon: 'person',
          color: '#007aff',
          open: { pathname: '/person/[id]', params: { id: 'me' } },
          words: 'activity profile work',
        },
        { title: 'Edit profile', icon: 'pencil', color: '#8e8e93', open: '/profile', words: 'name photo' },
        { title: 'Settings', icon: 'settings', color: '#8e8e93', open: '/settings', words: 'theme face id' },
        {
          title: 'Portal website',
          short: 'Website',
          icon: 'globe',
          color: '#0a84ff',
          open: () => void openWebsite('/'),
          words: 'browser',
        },
      ],
    },
  ];

  const everything = groups.flatMap((g) => g.items);
  const quickKeys = useTopShortcuts(
    QUICK_DEFAULTS,
    everything.map((i) => i.title),
  );
  const quick = quickKeys
    .map((k) => everything.find((i) => i.title === k))
    .filter((i): i is Item => !!i);

  const words = search.trim().toLowerCase();
  const shown = groups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (i) => !words || `${i.title} ${i.words ?? ''} ${g.title}`.toLowerCase().includes(words),
      ),
    }))
    .filter((g) => g.items.length);

  return (
    <Screen style={{ backgroundColor: theme.grouped }} contentContainerStyle={styles.screen}>
      <ThemedText type="title" style={styles.title}>
        Shortcuts
      </ThemedText>
      {!words ? (
        <View style={styles.quick}>
          {quick.map((item) => (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              onPress={() => openItem(item)}
              style={({ pressed }) => [styles.quickItem, { opacity: pressed ? 0.6 : 1 }]}>
              <View style={[styles.quickIcon, { backgroundColor: item.color }]}>
                <Icon name={item.icon} size={26} color="#fff" />
                {item.detail ? (
                  <View style={[styles.quickBadge, { borderColor: theme.grouped }]}>
                    <ThemedText style={styles.quickBadgeText}>{item.detail}</ThemedText>
                  </View>
                ) : null}
              </View>
              <ThemedText type="small" numberOfLines={1} style={styles.quickLabel}>
                {item.short ?? item.title}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
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
      {shown.map((g) => (
        <View key={g.title} style={styles.group}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.groupTitle}>
            {g.title.toUpperCase()}
          </ThemedText>
          <View style={[styles.list, { backgroundColor: theme.backgroundElement }]}>
            {g.items.map((item, i) => (
              <ShortcutRow key={item.title} item={item} last={i === g.items.length - 1} />
            ))}
          </View>
        </View>
      ))}
      {!shown.length ? (
        <ThemedText themeColor="textSecondary" style={styles.none}>
          No results for “{search.trim()}”
        </ThemedText>
      ) : null}
    </Screen>
  );
}

function ShortcutRow({ item, last }: { item: Item; last: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => openItem(item)}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.backgroundSelected }]}>
      <View style={[styles.square, { backgroundColor: item.color }]}>
        <Icon name={item.icon} size={17} color="#fff" />
      </View>
      <View style={[styles.rowBody, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}>
        <ThemedText style={styles.flex} numberOfLines={1}>
          {item.title}
        </ThemedText>
        {item.detail ? (
          <ThemedText themeColor="textSecondary" style={styles.detail}>
            {item.detail}
          </ThemedText>
        ) : null}
        <Icon name="chevron" size={13} color={theme.textSecondary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { gap: Spacing.four },
  title: { marginBottom: -Spacing.two },
  quick: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.one },
  quickItem: { width: '23%', alignItems: 'center', gap: 6 },
  quickIcon: {
    width: 62,
    height: 62,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    paddingHorizontal: 5,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBadgeText: { color: '#fff', fontSize: 12, lineHeight: 15, fontWeight: '700' },
  quickLabel: { textAlign: 'center' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 10,
    paddingHorizontal: Spacing.two + Spacing.one,
    height: 38,
  },
  searchInput: { flex: 1, fontSize: 17, paddingVertical: 0 },
  group: { gap: Spacing.two - 2 },
  groupTitle: { fontSize: 13, paddingHorizontal: Spacing.three },
  list: { borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: Spacing.three, minHeight: 44 },
  square: {
    width: 29,
    height: 29,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingRight: Spacing.three,
  },
  detail: { fontSize: 16 },
  none: { textAlign: 'center', paddingVertical: Spacing.five },
});
