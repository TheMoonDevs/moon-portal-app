import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Alert, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Row, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useCompany } from '@/lib/company';
import { APP_VERSION, PORTAL_URL } from '@/lib/config';

/** The person, their company, the website, and signing out. */
export default function MoreScreen() {
  const { profile, signOut } = useAuth();
  const { company, companies } = useCompany();

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'You’ll need your sign-in code and Google to come back.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);

  return (
    <Screen>
      <ThemedText type="title">More</ThemedText>

      <Card>
        <ThemedText type="subtitle">{profile?.name || 'You'}</ThemedText>
        {profile?.email ? (
          <ThemedText type="small" themeColor="textSecondary">
            {profile.email}
          </ThemedText>
        ) : null}
        {profile?.username ? (
          <ThemedText type="small" themeColor="textSecondary">
            @{profile.username}
          </ThemedText>
        ) : null}
      </Card>

      <Card>
        <Row
          title="Company"
          detail={company?.name ?? '—'}
          onPress={companies.length > 1 ? () => router.push('/company') : undefined}
        />
        <Row
          title="Open the portal website"
          detail={PORTAL_URL.replace(/^https?:\/\//, '')}
          onPress={() => void WebBrowser.openBrowserAsync(PORTAL_URL)}
        />
      </Card>

      <Button title="Sign out" kind="danger" onPress={confirmSignOut} />

      <View style={styles.footer}>
        <ThemedText type="small" themeColor="textSecondary">
          Portal · version {APP_VERSION}
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { alignItems: 'center', paddingVertical: Spacing.two },
});
