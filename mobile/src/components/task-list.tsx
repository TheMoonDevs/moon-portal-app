import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ProjectRef, Task } from '@/lib/types';

const STATUS_LABEL: Record<string, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'Doing',
  IN_REVIEW: 'In review',
  DONE: 'Done',
  IGNORED: 'Not doing',
  ARCHIVED: 'Archived',
};

const FLAG_LABEL: Record<string, string> = {
  waiting: 'Waiting on you',
  blocked: 'Blocked',
  not_done: 'Not done',
};

/** Tasks grouped under their projects, read-only for now. */
export function TaskList({ tasks, projects }: { tasks: Task[]; projects: ProjectRef[] }) {
  const theme = useTheme();
  const byProject = new Map<string, Task[]>();
  for (const task of tasks) {
    byProject.set(task.projectId, [...(byProject.get(task.projectId) ?? []), task]);
  }
  const name = (id: string) => projects.find((p) => p.id === id)?.name ?? 'Other';
  const groups = Array.from(byProject.entries()).sort((a, b) => name(a[0]).localeCompare(name(b[0])));

  return (
    <>
      {groups.map(([projectId, items]) => {
        const color = projects.find((p) => p.id === projectId)?.color;
        return (
          <Card key={projectId}>
            <View style={styles.projectRow}>
              <View style={[styles.dot, { backgroundColor: color || theme.textSecondary }]} />
              <ThemedText type="label" themeColor="textSecondary">
                {name(projectId)}
              </ThemedText>
            </View>
            {items.map((task) => {
              const done = task.status === 'DONE';
              const flag = task.flag ? FLAG_LABEL[task.flag] : null;
              return (
                <View key={task.id} style={[styles.task, { borderColor: theme.border }]}>
                  <ThemedText
                    style={done && { textDecorationLine: 'line-through', color: theme.textSecondary }}>
                    {task.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor={flag ? 'danger' : 'textSecondary'}>
                    {flag ?? STATUS_LABEL[task.status] ?? task.status}
                  </ThemedText>
                </View>
              );
            })}
          </Card>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  projectRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 8, height: 8, borderRadius: 4 },
  task: {
    gap: Spacing.half,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
