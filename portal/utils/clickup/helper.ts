import { Task } from "@prisma/client";
import { RawTask } from "../@types/clickup/types";

function isValidDate(timestamp: string) {
  const date = new Date(+timestamp);
  return timestamp ? date : null; // Returns true if the timestamp is valid, false otherwise
}

export function filterTask(task: RawTask): Task | null {
  if (task.archived) {
    return null;
  }
  return {
    taskId: task.id as string,
    name: task.name,
    status: task.status.status,
    priority: task.priority?.priority ?? null,
    assignees: task.assignees.map((assignee: any) => assignee.email),
    url: task.url,
    startDate: isValidDate(task.start_date as string),
    dueDate: isValidDate(task.due_date as string),
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
