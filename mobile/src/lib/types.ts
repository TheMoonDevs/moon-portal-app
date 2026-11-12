/*
 * The shapes the app reads from the portal API. Copied from portal/models
 * (workspace.ts, users.ts) and trimmed to the fields the app uses; keep them
 * in step when those change.
 */

export type Profile = {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  avatar: string | null;
};

export type Company = {
  id: string;
  name: string;
  slug?: string;
  logo?: string | null;
  color?: string | null;
  isPersonal?: boolean;
};

/** GET /api/workspace */
export type Workspace = {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  permissions: string[];
  companies: { company: Company; permissions: string[] }[];
};

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'IGNORED' | 'ARCHIVED';

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  companyId: string;
  projectId: string;
  forDate?: string | null;
  dueDate?: string | null;
  /** "waiting", "blocked"… a status the task's last point set. */
  flag?: string | null;
};

export type ProjectRef = {
  id: string;
  name: string;
  color?: string | null;
  logo?: string | null;
  companyId: string;
};

/** GET /api/me/day?date=YYYY-MM-DD */
export type Day = {
  date: string;
  today: string;
  tasks: Task[];
  projects: ProjectRef[];
};

/** GET /api/me/tasks */
export type MyTasks = {
  tasks: Task[];
  projects: ProjectRef[];
};
