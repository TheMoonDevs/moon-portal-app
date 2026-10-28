import type { ProjectPage, Task, User } from '@db/client';

import type { ProjectRow } from '../Admin/Workspace/AdminProjects';

export type Person = Pick<
  User,
  'id' | 'name' | 'avatar' | 'email' | 'username' | 'positionTitle'
>;

export type ProjectData = {
  project: ProjectRow;
  tasks: Task[];
  /** The project's leads and team. */
  people: Person[];
  /** The company's projects, to find the one above and the ones under. */
  tree?: {
    id: string;
    companyId: string;
    name: string;
    color?: string | null;
    parentId?: string | null;
    leadIds?: string[] | null;
  }[];
};

export type PagesData = {
  objective: ProjectPage | null;
  /** Every page of the project, nested through `parentId`. */
  pages: ProjectPage[];
};

/** The first one is where a project opens. */
export const VIEWS = [
  { key: 'worklogs', label: 'Worklogs', icon: 'history_edu' },
  { key: 'objective', label: 'Objective', icon: 'flag' },
  { key: 'kpi', label: 'KPI', icon: 'monitoring' },
  { key: 'pages', label: 'Pages', icon: 'description' },
  { key: 'goals', label: 'Goals', icon: 'track_changes' },
  { key: 'schedule', label: 'Task Schedule', icon: 'calendar_month' },
  { key: 'members', label: 'Members', icon: 'group' },
] as const;

export type ViewKey = (typeof VIEWS)[number]['key'];

export const isView = (value: unknown): value is ViewKey =>
  VIEWS.some((v) => v.key === value);

export const pageTitle = (page: Pick<ProjectPage, 'title'>) =>
  page.title?.trim() || 'Untitled';

/** Oldest first, so a page tree keeps its order as pages are edited. */
export const byCreation = (a: ProjectPage, b: ProjectPage) =>
  new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();

/** "2 min ago", "Yesterday", "12 Oct". */
export const ago = (value?: string | Date | null) => {
  if (!value) return '';
  const then = new Date(value).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
};

/** Plain text of a Tiptap document, for previews. */
export const docText = (doc: unknown, max = 160): string => {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (out.join(' ').length > max || !node || typeof node !== 'object') return;
    const n = node as { text?: string; content?: unknown[] };
    if (typeof n.text === 'string') out.push(n.text);
    n.content?.forEach(walk);
  };
  walk(doc);
  const text = out.join(' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
};
