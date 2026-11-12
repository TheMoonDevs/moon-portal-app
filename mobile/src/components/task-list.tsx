import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Card, Dot } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { statusLabel, useChangeTask } from '@/lib/tasks';
import type { ProjectRef, Task } from '@/lib/types';
import { projectName } from '@/lib/project-name';

/** One task: a circle to tick it done, its title and status. Opens the task. */
export function TaskRow({ task, showDay }: { task: Task; showDay?: boolean }) {
  const theme = useTheme();
  const change = useChangeTask();
  const done = task.status === 'DONE';
  const flagged = !!task.flag;

  const toggle = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
    change.mutate({ taskId: task.id, status: done ? 'todo' : 'done' });
  };

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
      style={({ pressed }) => [styles.task, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? 'Mark not done' : 'Mark done'}
        hitSlop={10}
        onPress={toggle}>
        <Icon
          name={done ? 'checkCircle' : 'circle'}
          size={22}
          color={done ? theme.success : theme.textSecondary}
        />
      </Pressable>
      <View style={styles.text}>
        <ThemedText
          style={done && { textDecorationLine: 'line-through', color: theme.textSecondary }}>
          {task.title || 'Untitled task'}
        </ThemedText>
        <ThemedText type="small" themeColor={flagged ? 'danger' : 'textSecondary'}>
          {task.meeting ? `${task.meeting.time} · with ${task.meeting.with}` : statusLabel(task)}
          {showDay && task.forDate ? ` · ${task.forDate}` : ''}
        </ThemedText>
      </View>
    </Pressable>
  );
}

/** Tasks grouped under their projects. */
export function TaskList({
  tasks,
  projects,
  showDay,
}: {
  tasks: Task[];
  projects: ProjectRef[];
  showDay?: boolean;
}) {
  const byProject = new Map<string, Task[]>();
  for (const task of tasks) {
    byProject.set(task.projectId || '', [...(byProject.get(task.projectId || '') ?? []), task]);
  }
  const name = (id: string) => {
    const project = projects.find((p) => p.id === id);
    return project ? projectName(project, project.companyName) : id ? 'Other' : 'No project';
  };
  const groups = Array.from(byProject.entries()).sort((a, b) => name(a[0]).localeCompare(name(b[0])));

  return (
    <>
      {groups.map(([projectId, items]) => (
        <Card key={projectId || 'none'}>
          <View style={styles.projectRow}>
            <Dot color={projects.find((p) => p.id === projectId)?.color} />
            <ThemedText type="label" themeColor="textSecondary">
              {name(projectId)}
            </ThemedText>
          </View>
          {items.map((task) => (
            <TaskRow key={task.id} task={task} showDay={showDay} />
          ))}
        </Card>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  projectRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  task: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + Spacing.one,
    paddingTop: Spacing.two + Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, gap: Spacing.half },
});
