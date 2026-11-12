import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Notice, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';

/** Messages arrive in a later step of the plan (step 7). */
export default function MessagesScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="title">Messages</ThemedText>
      </View>
      <Notice
        title="Coming soon"
        body="Chats with your team will live here, with live ticks and notifications."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.one },
});
