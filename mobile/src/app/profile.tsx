import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar, Button, Field, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, messageOf } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Profile } from '@/lib/types';

const PHONE_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const MAX_BYTES = 4 * 1024 * 1024;

/** Their name, title, username, time zone and photo, as on the website. */
export default function ProfileScreen() {
  const theme = useTheme();
  const { profile, setProfile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name ?? '');
  const [title, setTitle] = useState(profile?.positionTitle ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [timezone, setTimezone] = useState(profile?.timezone ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  if (!profile) return null;

  const changed =
    name.trim() !== (profile.name ?? '') ||
    title.trim() !== (profile.positionTitle ?? '') ||
    username.trim() !== (profile.username ?? '') ||
    timezone.trim() !== (profile.timezone ?? '');

  const save = async () => {
    setSaving(true);
    try {
      await api('/api/user', {
        method: 'PUT',
        body: {
          id: profile.id,
          name: name.trim(),
          positionTitle: title.trim() || null,
          username: username.trim() || null,
          timezone: timezone.trim() || null,
        },
      });
      setProfile({
        ...profile,
        name: name.trim(),
        positionTitle: title.trim() || null,
        username: username.trim() || null,
        timezone: timezone.trim() || null,
      });
      void refreshProfile();
      Alert.alert('Saved');
    } catch (e) {
      Alert.alert('Couldn’t save your profile', messageOf(e));
    } finally {
      setSaving(false);
    }
  };

  const upload = async (asset: ImagePicker.ImagePickerAsset) => {
    if (asset.fileSize && asset.fileSize > MAX_BYTES) {
      Alert.alert('That photo is too big', 'Pick one under 4 MB.');
      return;
    }
    const type = asset.mimeType && asset.mimeType !== 'image/heic' ? asset.mimeType : 'image/jpeg';
    const form = new FormData();
    // React Native sends a file from its uri.
    form.append('file', {
      uri: asset.uri,
      name: asset.fileName ?? `avatar.${type.split('/')[1] ?? 'jpg'}`,
      type,
    } as unknown as Blob);
    form.append('userId', profile.id);
    setUploading(true);
    try {
      const res = await api<{ avatar: string }>('/api/user/avatar', { method: 'POST', form });
      setProfile({ ...profile, avatar: res.avatar } as Profile);
    } catch (e) {
      Alert.alert('Couldn’t change your photo', messageOf(e));
    } finally {
      setUploading(false);
    }
  };

  const pick = (camera: boolean) => async () => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    };
    if (camera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera access is off', 'Allow Portal to use the camera in Settings.');
        return;
      }
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets[0]) await upload(result.assets[0]);
  };

  const choosePhoto = () =>
    Alert.alert('Profile photo', undefined, [
      { text: 'Take a photo', onPress: () => void pick(true)() },
      { text: 'Choose from library', onPress: () => void pick(false)() },
      { text: 'Cancel', style: 'cancel' },
    ]);

  return (
    <Screen edgeTop={false}>
      <Pressable onPress={choosePhoto} style={styles.photo} accessibilityRole="button" accessibilityLabel="Change photo">
        <Avatar uri={profile.avatar} name={profile.name} size={96} />
        {uploading ? (
          <ActivityIndicator color={theme.text} />
        ) : (
          <ThemedText type="smallBold">Change photo</ThemedText>
        )}
      </Pressable>

      <Label text="Name" />
      <Field value={name} onChangeText={setName} maxLength={80} autoComplete="name" />
      <Label text="Title" />
      <Field value={title} onChangeText={setTitle} placeholder="e.g. Designer" maxLength={80} />
      <Label text="Username" />
      <Field
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={40}
      />
      <Label text="Time zone" />
      <Field
        value={timezone}
        onChangeText={setTimezone}
        placeholder={PHONE_ZONE}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {PHONE_ZONE && timezone !== PHONE_ZONE ? (
        <ThemedText type="small" themeColor="textSecondary" onPress={() => setTimezone(PHONE_ZONE)}>
          Use this phone’s: {PHONE_ZONE} ›
        </ThemedText>
      ) : null}
      {profile.email ? (
        <>
          <Label text="Email" />
          <ThemedText themeColor="textSecondary">{profile.email}</ThemedText>
        </>
      ) : null}
      <View style={styles.gap} />
      <Button title="Save" busy={saving} disabled={!changed || !name.trim()} onPress={() => void save()} />
    </Screen>
  );
}

function Label({ text }: { text: string }) {
  return (
    <ThemedText type="label" themeColor="textSecondary" style={styles.label}>
      {text}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  photo: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  label: { marginBottom: -Spacing.two },
  gap: { height: Spacing.two },
});
