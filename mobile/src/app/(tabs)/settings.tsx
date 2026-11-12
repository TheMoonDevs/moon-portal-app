import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import { type ReactNode, useEffect, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Switch, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Avatar, Card, PressableCard, Row, Screen, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, messageOf } from '@/lib/api';
import { appleAvailable, appleIdentityToken } from '@/lib/apple';
import { useAuth } from '@/lib/auth';
import { APP_VERSION, PORTAL_URL } from '@/lib/config';
import { timeAgo } from '@/lib/dates';
import { openWebsite } from '@/lib/links';
import { biometricsAvailable, confirmWithBiometrics } from '@/lib/lock';
import { unreadCount, useNotifications } from '@/lib/notifications';
import { setPreference, type ThemeChoice, usePreferences } from '@/lib/preferences';
import { registerForPush, unregisterPush } from '@/lib/push';
import { queryClient } from '@/lib/query';
import type { Connection } from '@/lib/types';
import { nativeVersion } from '@/lib/updates';

/**
 * The person: their page, then the app's settings (theme, Face ID,
 * notifications, Apple, connected apps) and the account. Companies aren't
 * picked here: the app shows every company at once.
 */
export default function SettingsScreen() {
  const theme = useTheme();
  const unread = unreadCount(useNotifications().data);
  const prefs = usePreferences();
  const { profile, refreshProfile, signOut } = useAuth();
  const [canLock, setCanLock] = useState(false);
  const [canApple, setCanApple] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const connections = useQuery({
    queryKey: ['connections'],
    queryFn: () => api<{ tokens: Connection[] }>('/api/me/tokens'),
  });

  useEffect(() => {
    void biometricsAvailable().then(setCanLock);
    void appleAvailable().then(setCanApple);
  }, []);

  const toggleLock = async (on: boolean) => {
    if (on && !(await confirmWithBiometrics('Turn on Face ID lock'))) return;
    await setPreference('lock', on);
  };

  const togglePush = async (on: boolean) => {
    if (!on) {
      await unregisterPush();
      await setPreference('push', false);
      return;
    }
    const result = await registerForPush(true);
    if (result === 'denied')
      Alert.alert('Notifications are off for Portal', 'Turn them on in your phone’s Settings.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => void Linking.openSettings() },
      ]);
    if (result === 'unavailable')
      Alert.alert('Notifications aren’t available', 'They need a real phone with this app’s build.');
    await setPreference('push', result === 'on');
  };

  const linkApple = async () => {
    setBusy('apple');
    try {
      if (profile?.appleLinked) {
        await api('/api/mobile/auth/apple', { method: 'DELETE' });
      } else {
        const identityToken = await appleIdentityToken();
        if (!identityToken) return;
        await api('/api/mobile/auth/apple', { method: 'POST', body: { identityToken } });
      }
      await refreshProfile();
    } catch (e) {
      Alert.alert('Couldn’t change Sign in with Apple', messageOf(e));
    } finally {
      setBusy(null);
    }
  };

  const disconnect = (c: Connection) =>
    Alert.alert(`Disconnect ${c.name}?`, 'It stops working with your portal at once.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          try {
            await api('/api/me/tokens', { method: 'DELETE', body: { id: c.id } });
            void queryClient.invalidateQueries({ queryKey: ['connections'] });
          } catch (e) {
            Alert.alert('Couldn’t disconnect it', messageOf(e));
          }
        },
      },
    ]);

  const checkForUpdate = async () => {
    setChecking(true);
    try {
      const found = await Updates.checkForUpdateAsync();
      if (!found.isAvailable) {
        Alert.alert('You’re up to date');
        return;
      }
      await Updates.fetchUpdateAsync();
      Alert.alert('Update ready', 'Restart Portal to use it.', [
        { text: 'Later', style: 'cancel' },
        { text: 'Restart', onPress: () => void Updates.reloadAsync() },
      ]);
    } catch {
      Alert.alert('Couldn’t check for updates', 'Updates work in TestFlight and store builds, not in development.');
    } finally {
      setChecking(false);
    }
  };

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'You’ll need your sign-in code to come back.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);

  const apps = connections.data?.tokens ?? [];
  const switchColors = { true: theme.success };

  return (
    <Screen>
      <ThemedText type="title">Settings</ThemedText>

      <PressableCard
        onPress={() => router.push({ pathname: '/person/[id]', params: { id: 'me' } })}
        style={styles.me}>
        <Avatar uri={profile?.avatar} name={profile?.name} size={60} />
        <View style={styles.flex}>
          <ThemedText type="subtitle" numberOfLines={1}>
            {profile?.name || 'You'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {[profile?.positionTitle, profile?.username ? `@${profile.username}` : null]
              .filter(Boolean)
              .join(' · ') || 'Your page'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Your page, activity and what’s next
          </ThemedText>
        </View>
        <Icon name="chevron" size={14} color={theme.textSecondary} />
      </PressableCard>

      <Card style={styles.list}>
        <Row icon="pencil" title="Edit profile" detail="Name, photo, title and timezone" chevron onPress={() => router.push('/profile')} />
        <Row
          icon="bell"
          title="Notifications"
          detail={unread ? `${unread} unread` : null}
          chevron
          onPress={() => router.push('/notifications')}
        />
        <Row icon="video" title="Meetings" detail="Upcoming, and your booking link" chevron onPress={() => router.push('/meetings')} />
      </Card>

      <Section title="Appearance">
        <Segmented<ThemeChoice>
          value={prefs.theme}
          onChange={(v) => void setPreference('theme', v)}
          options={[
            { value: 'system', label: 'Automatic' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </Section>

      <Section title="Privacy and alerts">
        <Card style={styles.list}>
          {canLock ? (
            <Row
              icon="lock"
              title={Platform.OS === 'ios' ? 'Lock with Face ID' : 'Lock with fingerprint'}
              detail="Asks when you open Portal, and after a minute away"
              right={<Switch value={prefs.lock} onValueChange={(v) => void toggleLock(v)} trackColor={switchColors} />}
            />
          ) : null}
          <Row
            icon="bell"
            title="Notifications"
            detail="Messages, meetings, reminders and approvals"
            right={<Switch value={prefs.push} onValueChange={(v) => void togglePush(v)} trackColor={switchColors} />}
          />
        </Card>
      </Section>

      {canApple ? (
        <Section title="Sign in with Apple">
          <Card style={styles.list}>
            <Row
              icon="apple"
              title={profile?.appleLinked ? 'Apple ID linked' : 'Link your Apple ID'}
              detail={
                profile?.appleLinked
                  ? 'You can sign in with Apple or Google. Tap to unlink.'
                  : 'Then sign in with Apple next time, without Google.'
              }
              onPress={busy ? undefined : () => void linkApple()}
            />
          </Card>
        </Section>
      ) : null}

      <Section title="Connected apps">
        <Card style={styles.list}>
          {apps.length ? (
            apps.map((c) => (
              <Row
                key={c.id}
                icon="link"
                title={c.name}
                detail={`${c.viaOAuth ? 'Connected' : 'Token'} · ${
                  c.lastUsedAt ? `used ${timeAgo(c.lastUsedAt)}` : 'not used yet'
                }`}
                right={
                  <ThemedText type="smallBold" themeColor="danger" onPress={() => disconnect(c)}>
                    Disconnect
                  </ThemedText>
                }
              />
            ))
          ) : (
            <Row
              icon="link"
              title={connections.isPending ? 'Loading…' : 'Nothing connected'}
              detail="Claude and other assistants you connect show here."
            />
          )}
        </Card>
      </Section>

      <Section title="Account">
        <Card style={styles.list}>
          <Row icon="logout" title="Sign out" onPress={confirmSignOut} />
          <Row icon="trash" title="Delete my account" danger chevron onPress={() => router.push('/delete-account')} />
        </Card>
      </Section>

      <Section title="About">
        <Card style={styles.list}>
          <Row
            icon="globe"
            title="Open the portal website"
            detail={PORTAL_URL.replace(/^https?:\/\//, '')}
            onPress={() => void openWebsite('/')}
          />
          <Row
            icon="bolt"
            title={checking ? 'Checking…' : 'Check for updates'}
            detail={`Version ${nativeVersion()}${Updates.updateId ? ` · update ${Updates.updateId.slice(0, 8)}` : ''}${
              Updates.channel ? ` · ${Updates.channel}` : ''
            }`}
            onPress={checking ? undefined : () => void checkForUpdate()}
          />
          <Row icon="page" title="Privacy Policy" chevron onPress={() => void openWebsite('/privacy')} />
          <Row icon="page" title="Terms & Conditions" chevron onPress={() => void openWebsite('/terms')} />
        </Card>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Portal {APP_VERSION}
        </ThemedText>
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="label" themeColor="textSecondary">
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  me: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  section: { gap: Spacing.two },
  list: { paddingVertical: 0, gap: 0 },
  center: { textAlign: 'center' },
});
