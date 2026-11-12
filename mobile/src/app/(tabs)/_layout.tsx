import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/hooks/use-theme';
import { useChatUnread } from '@/lib/chat';
import { useWorkBadge } from '@/lib/work-badge';

/** A badge's words: none at zero, so no badge shows (not a 0). */
const count = (n: number) => (n <= 0 ? undefined : n > 99 ? '99+' : String(n));

/** The tab bar: Home, Work, Shortcuts, Chat, Settings. */
export default function TabsLayout() {
  const theme = useTheme();
  const unread = useChatUnread().data?.unread ?? 0;
  const work = useWorkBadge();
  return (
    <NativeTabs
      backgroundColor={theme.background}
      indicatorColor={theme.backgroundSelected}
      labelStyle={{ selected: { color: theme.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      {/* The Work tab keeps its own insets: its pager and + end above the tab bar. */}
      <NativeTabs.Trigger name="work" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Work</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'checklist', selected: 'checklist.checked' }}
          md="task_alt"
        />
        <NativeTabs.Trigger.Badge hidden={!work}>{count(work)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="shortcuts">
        <NativeTabs.Trigger.Label>Shortcuts</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} md="apps" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages">
        <NativeTabs.Trigger.Label>Chat</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{
            default: 'bubble.left.and.bubble.right',
            selected: 'bubble.left.and.bubble.right.fill',
          }}
          md="chat"
        />
        <NativeTabs.Trigger.Badge hidden={!unread}>{count(unread)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
