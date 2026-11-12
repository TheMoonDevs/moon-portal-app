import * as LocalAuthentication from 'expo-local-authentication';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { PortalMark } from '@/components/portal-mark';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useAuth } from './auth';
import { usePreferences } from './preferences';

/** Back after this long in the background: unlock again. */
const RELOCK_AFTER_MS = 60_000;

/** Whether the phone can use Face ID, Touch ID or a fingerprint. */
export async function biometricsAvailable() {
  try {
    return (
      (await LocalAuthentication.hasHardwareAsync()) &&
      (await LocalAuthentication.isEnrolledAsync())
    );
  } catch {
    return false;
  }
}

/** Asks for Face ID / fingerprint (or the phone's passcode). */
export async function confirmWithBiometrics(reason = 'Unlock Portal') {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancel',
    });
    return result.success;
  } catch {
    return false;
  }
}

/**
 * With the lock on (Settings), covers the app until the person unlocks it:
 * at launch and after a minute in the background.
 */
export function LockGate({ children }: { children: ReactNode }) {
  const { lock } = usePreferences();
  const { status, signOut } = useAuth();
  const theme = useTheme();
  const enabled = lock && status === 'signedIn';
  const [locked, setLocked] = useState(enabled);
  const [lastStatus, setLastStatus] = useState(status);
  const leftAt = useRef<number | null>(null);
  const asking = useRef(false);

  // Opening the app signed in (the saved session loads after the first
  // render) locks it; signing out unlocks it.
  if (status !== lastStatus) {
    setLastStatus(status);
    if (lastStatus === 'loading' && status === 'signedIn' && lock) setLocked(true);
    if (status !== 'signedIn') setLocked(false);
  }

  const unlock = useCallback(async () => {
    if (asking.current) return;
    asking.current = true;
    const ok = await confirmWithBiometrics();
    asking.current = false;
    if (ok) setLocked(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') leftAt.current = Date.now();
      if (state === 'active' && leftAt.current && Date.now() - leftAt.current > RELOCK_AFTER_MS)
        setLocked(true);
    });
    return () => sub.remove();
  }, [enabled]);

  // Ask for Face ID as soon as it locks.
  useEffect(() => {
    if (!enabled || !locked || asking.current) return;
    asking.current = true;
    void confirmWithBiometrics().then((ok) => {
      asking.current = false;
      if (ok) setLocked(false);
    });
  }, [enabled, locked]);

  return (
    <View style={styles.fill}>
      {children}
      {enabled && locked ? (
        <View style={[StyleSheet.absoluteFill, styles.cover, { backgroundColor: theme.background }]}>
          <PortalMark size={72} />
          <ThemedText type="subtitle">Portal is locked</ThemedText>
          <Button title="Unlock" onPress={() => void unlock()} style={styles.button} />
          <Button title="Sign out" kind="secondary" onPress={() => void signOut()} style={styles.button} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  cover: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  button: { alignSelf: 'stretch' },
});
