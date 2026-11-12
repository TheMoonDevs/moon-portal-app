import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PortalMark } from '@/components/portal-mark';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { googleReady } from '@/lib/google';

/**
 * Sign in as on the website: the six-character sign-in code from the portal,
 * then a Google account linked to that code.
 */
export default function SignInScreen() {
  const theme = useTheme();
  const { signIn } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = googleReady();

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(code);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <PortalMark size={64} />
          <View style={styles.heading}>
            <ThemedText type="title">Portal</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.center}>
              Worklogs, projects and progress for every company you work with.
            </ThemedText>
          </View>

          <View style={styles.form}>
            <ThemedText type="label" themeColor="textSecondary">
              Your sign-in code
            </ThemedText>
            <TextInput
              value={code}
              onChangeText={(text) => setCode(text.toUpperCase())}
              placeholder="ABC123"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              maxLength={12}
              returnKeyType="go"
              onSubmitEditing={() => code.trim() && ready && submit()}
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}
            />
            <Button
              title="Continue with Google"
              onPress={submit}
              busy={busy}
              disabled={!code.trim() || !ready}
            />
            {error ? (
              <ThemedText type="small" themeColor="danger" style={styles.center}>
                {error}
              </ThemedText>
            ) : null}
            {!ready ? (
              <ThemedText type="small" themeColor="danger" style={styles.center}>
                Google sign-in isn’t set up in this build yet (see mobile/README.md).
              </ThemedText>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              Your code is in the email you got when you joined, and in Settings on the portal website. Use a Google account linked
              to it.
            </ThemedText>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.five,
    padding: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  heading: { alignItems: 'center', gap: Spacing.two },
  form: { alignSelf: 'stretch', gap: Spacing.three },
  input: {
    height: 52,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    fontSize: 20,
    letterSpacing: 4,
    textAlign: 'center',
    fontWeight: 600,
  },
  center: { textAlign: 'center' },
});
