import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PortalMark } from '@/components/portal-mark';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { appleAvailable } from '@/lib/apple';
import { useAuth } from '@/lib/auth';
import { googleReady } from '@/lib/google';

/**
 * The code App Store and Google Play reviewers type to sign in with an email
 * and password instead of Google. The portal checks the email and password
 * (TEST_SIGN_IN_CODE in portal/lib/users/username.ts, the same value).
 */
const TEST_CODE = 'TEST12';

/**
 * Sign in as on the website: the six-character sign-in code from the portal,
 * then a Google account linked to that code. On iPhones, an Apple ID linked
 * in Settings works instead of Google. The test code asks for an email and
 * password instead.
 */
export default function SignInScreen() {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const { signIn, signInWithApple, signInWithPassword } = useAuth();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'google' | 'apple' | 'password' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apple, setApple] = useState(false);
  const ready = googleReady();
  const testing = code.trim() === TEST_CODE;
  const passwordReady = !!email.trim() && !!password && !busy;
  const fieldColors = {
    color: theme.text,
    backgroundColor: theme.backgroundElement,
    borderColor: theme.border,
  };

  useEffect(() => {
    void appleAvailable().then(setApple);
  }, []);

  const submit = async (via: 'google' | 'apple' | 'password') => {
    setBusy(via);
    setError(null);
    try {
      await (via === 'password'
        ? signInWithPassword(code, email, password)
        : via === 'apple'
          ? signInWithApple(code)
          : signIn(code));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.');
    } finally {
      setBusy(null);
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
              onSubmitEditing={() => !testing && code.trim() && ready && submit('google')}
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}
            />
            {testing ? (
              <>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="username"
                  returnKeyType="next"
                  style={[styles.input, styles.field, fieldColors]}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  secureTextEntry
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={() => passwordReady && submit('password')}
                  style={[styles.input, styles.field, fieldColors]}
                />
                <Button
                  title="Sign in"
                  onPress={() => void submit('password')}
                  busy={busy === 'password'}
                  disabled={!passwordReady}
                />
              </>
            ) : (
              <>
                <Button
                  title="Continue with Google"
                  onPress={() => void submit('google')}
                  busy={busy === 'google'}
                  disabled={!code.trim() || !ready || !!busy}
                />
                {apple ? (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                    buttonStyle={
                      dark
                        ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                        : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                    }
                    cornerRadius={Radius.medium}
                    style={[styles.apple, (!code.trim() || !!busy) && styles.dim]}
                    onPress={() => {
                      if (code.trim() && !busy) void submit('apple');
                      else if (!code.trim()) setError('Enter your sign-in code first.');
                    }}
                  />
                ) : null}
              </>
            )}
            {error ? (
              <ThemedText type="small" themeColor="danger" style={styles.center}>
                {error}
              </ThemedText>
            ) : null}
            {!ready && !testing ? (
              <ThemedText type="small" themeColor="danger" style={styles.center}>
                Google sign-in isn’t set up in this build yet (see mobile/README.md).
              </ThemedText>
            ) : null}
            {testing ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                Test sign-in for App Store and Google Play reviewers.
              </ThemedText>
            ) : (
              <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                Your code is in the email you got when you joined, and in Settings on the portal website. Use a Google account linked
                to it{apple ? ', or an Apple ID you linked in the app' : ''}.
              </ThemedText>
            )}
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
  field: { fontSize: 17, letterSpacing: 0, textAlign: 'left', fontWeight: 400 },
  center: { textAlign: 'center' },
  apple: { height: 48 },
  dim: { opacity: 0.5 },
});
