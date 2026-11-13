import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Button, Card } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { WhatsNew } from '@/constants/whats-new';
import { useTheme } from '@/hooks/use-theme';
import { closeWhatsNew, useWhatsNew } from '@/lib/whats-new';

const FIRST = 3;

/** On Home after an update: what changed, until it is closed. */
export function WhatsNewCard() {
  const theme = useTheme();
  const entry = useWhatsNew();
  const [all, setAll] = useState(false);
  if (!entry) return null;
  const more = entry.items.length - FIRST;
  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <Icon name="sparkles" size={18} color={theme.accent} />
        <ThemedText type="smallBold" style={styles.flex}>
          {entry.title}
        </ThemedText>
        <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel="Close" onPress={closeWhatsNew}>
          <Icon name="close" size={16} color={theme.textSecondary} />
        </Pressable>
      </View>
      <WhatsNewItems items={all ? entry.items : entry.items.slice(0, FIRST)} />
      <View style={styles.actions}>
        {more > 0 && !all ? (
          <Button small kind="secondary" title={`${more} more`} onPress={() => setAll(true)} />
        ) : null}
        <Button small title="Got it" onPress={closeWhatsNew} />
      </View>
    </Card>
  );
}

export function WhatsNewItems({ items }: { items: WhatsNew['items'] }) {
  return (
    <View style={styles.items}>
      {items.map((item) => (
        <View key={item} style={styles.item}>
          <ThemedText type="small" themeColor="textSecondary">
            •
          </ThemedText>
          <ThemedText type="small" style={styles.flex}>
            {item}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: Spacing.two },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  items: { gap: Spacing.one },
  item: { flexDirection: 'row', gap: Spacing.two },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two, marginTop: Spacing.one },
});
