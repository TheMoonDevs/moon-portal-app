import { RawTask, Task } from "../@types/clickup/types";

export function filterTask(task: RawTask): Task | null {
  if (task.archived) {
    return null;
  }

  return {
    taskId: task.id,
    name: task.name,
    status: task.status.status,
    priority: task.priority?.priority ?? null,
    assignees: task.assignees.map((assignee) => assignee.email),
    url: task.url,
    startDate: task.start_date,
    dueDate: task.due_date,
  };
}

// Function to filter an array of tasks
export function filterTasks(tasks: RawTask[]): Task[] {
  return tasks.reduce<Task[]>((filtered, task) => {
    const filteredTask = filterTask(task);
    if (filteredTask) {
      filtered.push(filteredTask);
    }
    return filtered;
  }, []);
}

export function filterTasksByPerson(email: string, tasks: Task[]): Task[] {
  return tasks.filter((task) => task.assignees.includes(email));
}
