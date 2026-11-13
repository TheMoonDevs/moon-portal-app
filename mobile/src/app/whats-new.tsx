import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card, Screen } from '@/components/ui';
import { WhatsNewItems } from '@/components/whats-new-card';
import { Spacing } from '@/constants/theme';
import { WHATS_NEW } from '@/constants/whats-new';

/** Every "What's new", newest first (from Settings). */
export default function WhatsNewScreen() {
  return (
    <Screen edgeTop={false}>
      {WHATS_NEW.map((entry) => (
        <Card key={entry.id} style={styles.card}>
          <ThemedText type="smallBold">{entry.title}</ThemedText>
          <WhatsNewItems items={entry.items} />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two },
});
