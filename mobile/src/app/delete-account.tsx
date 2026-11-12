import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Field, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { api, messageOf } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { confirmWithBiometrics } from '@/lib/lock';

/**
 * Asks for the account to be deleted (an App Store and Play rule): the
 * portal's admins are told, and the phone signs out. Company work stays
 * with the company, as the website's admin delete does.
 */
export default function DeleteAccountScreen() {
  const { profile, forget } = useAuth();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const requested = profile?.deletionRequestedAt;

  const submit = async () => {
    setBusy(true);
    try {
      await api('/api/mobile/account/delete', { method: 'POST', body: { reason: reason.trim() || null } });
      Alert.alert(
        'Request sent',
        'Your admins will delete your account and tell you when it’s done. You’re signed out on this phone.',
        [{ text: 'OK', onPress: () => void forget() }],
      );
    } catch (e) {
      Alert.alert('Couldn’t send the request', messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  const confirm = () =>
    Alert.alert('Delete your account?', 'This can’t be undone once your admins delete it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          // Face ID first, where the phone has it, so nobody else can do this.
          const ok = await confirmWithBiometrics('Confirm deleting your account').catch(() => true);
          if (ok) await submit();
        },
      },
    ]);

  return (
    <Screen edgeTop={false}>
      <ThemedText type="subtitle">Delete your Portal account</ThemedText>
      <Card>
        <ThemedText>What happens:</ThemedText>
        <View style={styles.list}>
          <ThemedText themeColor="textSecondary">• Your profile, sign-in and personal work are deleted.</ThemedText>
          <ThemedText themeColor="textSecondary">
            • Tasks and updates you did for a company stay with that company, without your profile.
          </ThemedText>
          <ThemedText themeColor="textSecondary">• Your admins do it, usually within a few days.</ThemedText>
          <ThemedText themeColor="textSecondary">• You’re signed out on this phone right away.</ThemedText>
        </View>
      </Card>
      {requested ? (
        <ThemedText themeColor="textSecondary">
          You already asked on {new Date(requested).toLocaleDateString()}. Sending again reminds your admins.
        </ThemedText>
      ) : null}
      <Field
        value={reason}
        onChangeText={setReason}
        placeholder="Anything you’d like us to know? (optional)"
        multiline
        maxLength={1000}
        style={styles.reason}
      />
      <Button title="Delete my account" kind="danger" busy={busy} onPress={confirm} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.one },
  reason: { minHeight: 96, textAlignVertical: 'top' },
});
