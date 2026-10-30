import type { PointStatus } from '@/lib/worklogs/timeline';
import { POINT_STATUSES } from '@/lib/worklogs/timeline';

/*
 * What the assistant sends when it logs work through the MCP server: one
 * point under one of the person's tasks (see ./daywork).
 */

export { POINT_STATUSES };
export type { PointStatus };

/** Today's date for a person, in their timezone when they set one. */
export function todayFor(timezone?: string | null) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export type PointInput = {
  text: string;
  status: PointStatus;
  project?: string;
  /** For company work that is on none of its projects. */
  company?: string;
  task?: string;
  /** Personal work: private to the person, under their Personal company. */
  personal?: boolean;
  /** Where the point goes when the caller already found its task. */
  place?: {
    companyId: string;
    projectId: string | null;
    taskId: string | null;
  };
  /** What just happened, added to the point's timeline. */
  note?: string;
  /** An existing point to update (its key or its text), whatever `text` says. */
  point?: string;
  /** A line the person typed themselves for the same work. */
  typedLine?: string;
  /** YYYY-MM-DD: the day the work was scheduled for, when done early or late. */
  forDate?: string;
};
