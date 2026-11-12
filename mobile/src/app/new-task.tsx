import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { useOnline } from '@/components/offline-banner';
import { ThemedText } from '@/components/themed-text';
import { Button, Chip, Field, Screen, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { api, messageOf, withQuery } from '@/lib/api';
import { useCompany } from '@/lib/company';
import { addDays, todayKey } from '@/lib/dates';
import { refreshWork } from '@/lib/query';
import type { Day, Task } from '@/lib/types';

type When = 'today' | 'tomorrow' | 'later';

/**
 * A new task on the person's day, as on the website's day sheet. Without a
 * project picked, the portal places it from its words.
 */
export default function NewTaskSheet() {
  const online = useOnline();
  const { company } = useCompany();
  const today = todayKey();
  const day = useQuery({
    queryKey: ['day', today],
    queryFn: () => api<Day>(withQuery('/api/me/day', { date: today })),
  });
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState<When>('today');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const projects = (day.data?.projects ?? []).filter(
    (p) => !company || p.companyId === company.id,
  );

  const save = async () => {
    setBusy(true);
    try {
      await api<{ task: Task }>('/api/me/day/tasks', {
        method: 'POST',
        body: {
          title: title.trim(),
          date: when === 'later' ? null : when === 'tomorrow' ? addDays(today, 1) : today,
          ...(projectId && { place: { projectId } }),
        },
      });
      refreshWork();
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t add the task', messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edgeTop={false}>
      <Field
        value={title}
        onChangeText={setTitle}
        placeholder="What needs doing?"
        autoFocus
        maxLength={200}
        returnKeyType="done"
        onSubmitEditing={() => title.trim() && online && void save()}
      />
      <Segmented
        value={when}
        onChange={setWhen}
        options={[
          { value: 'today', label: 'Today' },
          { value: 'tomorrow', label: 'Tomorrow' },
          { value: 'later', label: 'Later' },
        ]}
      />
      <ThemedText type="label" themeColor="textSecondary">
        Project
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="Pick for me" selected={!projectId} onPress={() => setProjectId(null)} />
        {projects.map((p) => (
          <Chip
            key={p.id}
            label={p.name}
            color={p.color}
            selected={projectId === p.id}
            onPress={() => setProjectId(p.id)}
          />
        ))}
      </ScrollView>
      <View style={styles.gap} />
      <Button title="Add task" busy={busy} disabled={!title.trim() || !online} onPress={() => void save()} />
      {!online ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Adding tasks needs a connection.
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { gap: Spacing.two },
  gap: { height: Spacing.one },
  center: { textAlign: 'center' },
});
