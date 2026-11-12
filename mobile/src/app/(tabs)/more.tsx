import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar, Card, IconButton, PressableCard, Row, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useCompany } from '@/lib/company';
import { APP_VERSION, PORTAL_URL } from '@/lib/config';
import { openWebsite } from '@/lib/links';
import { unreadCount, useNotifications } from '@/lib/notifications';

/** The person and everything that isn't a tab. */
export default function MoreScreen() {
  const { profile, signOut } = useAuth();
  const { company, companies } = useCompany();
  const unread = unreadCount(useNotifications().data);

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'You’ll need your sign-in code to come back.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);

  return (
    <Screen>
      <View style={styles.top}>
        <ThemedText type="title" style={styles.flex}>
          More
        </ThemedText>
        <IconButton name="settings" label="Settings" onPress={() => router.push('/settings')} />
      </View>

      <PressableCard onPress={() => router.push('/profile')} style={styles.me}>
        <Avatar uri={profile?.avatar} name={profile?.name} size={56} />
        <View style={styles.flex}>
          <ThemedText type="subtitle" numberOfLines={1}>
            {profile?.name || 'You'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {[profile?.positionTitle, profile?.username ? `@${profile.username}` : null]
              .filter(Boolean)
              .join(' · ') || 'Edit your profile'}
          </ThemedText>
        </View>
      </PressableCard>

      <Card style={styles.list}>
        <Row
          icon="bell"
          title="Notifications"
          detail={unread ? `${unread} unread` : null}
          chevron
          onPress={() => router.push('/notifications')}
        />
        <Row icon="video" title="Meetings" detail="Upcoming, and your booking link" chevron onPress={() => router.push('/meetings')} />
        <Row icon="history" title="Worklog history" chevron onPress={() => router.push('/history')} />
        <Row icon="star" title="Badges" chevron onPress={() => router.push('/badges')} />
      </Card>

      <Card style={styles.list}>
        <Row
          icon="folder"
          title="Company"
          detail={company?.name ?? '—'}
          chevron={companies.length > 1}
          onPress={companies.length > 1 ? () => router.push('/company') : undefined}
        />
        <Row icon="settings" title="Settings" detail="Theme, Face ID, notifications, connected apps" chevron onPress={() => router.push('/settings')} />
        <Row
          icon="globe"
          title="Open the portal website"
          detail={PORTAL_URL.replace(/^https?:\/\//, '')}
          onPress={() => void openWebsite('/')}
        />
      </Card>

      <Card style={styles.list}>
        <Row icon="logout" title="Sign out" danger onPress={confirmSignOut} />
      </Card>

      <View style={styles.footer}>
        <ThemedText type="small" themeColor="textSecondary">
          Portal · version {APP_VERSION}
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center' },
  me: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  list: { paddingVertical: 0, gap: 0 },
  footer: { alignItems: 'center', paddingVertical: Spacing.two },
});
