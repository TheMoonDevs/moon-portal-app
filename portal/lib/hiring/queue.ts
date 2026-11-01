import { db } from '@/lib/mongodb/db-client';
import type { JobApplication, JobOpening } from '@/models/hiring';
import {
  APPLICATION_STAGE,
  HIRING_EMAIL_STATUS,
  JOB_OPENING_STATUS,
} from '@/models/hiring';

import { applicationDueAt } from './tasks';

/*
 * The review queue: everything across a company's openings that waits on a
 * person. It is the hiring digest as a page: tasks that came back, people
 * still unscreened after a few days, tasks past their due date and emails
 * that didn't arrive.
 */

export type QueueKind = 'REVIEW' | 'UNSCREENED' | 'PAST_DUE' | 'BOUNCED';

export const QUEUE_KINDS: QueueKind[] = [
  'REVIEW',
  'PAST_DUE',
  'BOUNCED',
  'UNSCREENED',
];

const DAY_MS = 86400000;
export const DEFAULT_UNSCREENED_DAYS = 3;
export const MAX_UNSCREENED_DAYS = 60;

const UNDELIVERED = [
  HIRING_EMAIL_STATUS.BOUNCED,
  HIRING_EMAIL_STATUS.COMPLAINED,
  HIRING_EMAIL_STATUS.FAILED,
];

export interface QueueItem {
  kind: QueueKind;
  application: JobApplication;
  /** What started the wait: task sent back, applied, due date, email sent. */
  since: string;
  dueAt?: string | null;
}

export type QueueOpening = Pick<
  JobOpening,
  'id' | 'title' | 'hiringLeadId' | 'replyToLead' | 'task' | 'companyId'
>;

const time = (value: unknown) => new Date(String(value ?? '')).getTime() || 0;

export async function buildReviewQueue(
  companyId: string,
  unscreenedDays = DEFAULT_UNSCREENED_DAYS,
  now = new Date(),
): Promise<{ items: QueueItem[]; openings: QueueOpening[] }> {
  const openings: JobOpening[] = await db.jobOpening.findMany({
    where: {
      companyId,
      status: { notIn: [JOB_OPENING_STATUS.ARCHIVED] },
    },
  });
  if (!openings.length) return { items: [], openings: [] };
  const byId = new Map(openings.map((o) => [o.id, o]));

  const applications: JobApplication[] = await db.jobApplication.findMany({
    where: {
      openingId: { in: openings.map((o) => o.id) },
      stage: { notIn: [APPLICATION_STAGE.HIRED] },
    },
  });

  const cutoff = now.getTime() - unscreenedDays * DAY_MS;
  const items: QueueItem[] = [];
  for (const a of applications) {
    const opening = byId.get(a.openingId);
    if (!opening) continue;
    const rejected = a.stage === APPLICATION_STAGE.REJECTED;
    if (a.stage === APPLICATION_STAGE.TASK_REVIEW)
      items.push({
        kind: 'REVIEW',
        application: a,
        since: a.taskSubmission?.submittedAt ?? String(a.updatedAt ?? ''),
      });
    if (
      a.stage === APPLICATION_STAGE.APPLIED &&
      time(a.submittedAt) &&
      time(a.submittedAt) < cutoff
    )
      items.push({
        kind: 'UNSCREENED',
        application: a,
        since: String(a.submittedAt),
      });
    if (a.stage === APPLICATION_STAGE.TASK && !a.taskSubmission) {
      const due = applicationDueAt(opening.task, a);
      if (due && due < now)
        items.push({
          kind: 'PAST_DUE',
          application: a,
          since: due.toISOString(),
          dueAt: due.toISOString(),
        });
    }
    if (!rejected && a.lastEmail && UNDELIVERED.includes(a.lastEmail.status))
      items.push({
        kind: 'BOUNCED',
        application: a,
        since: a.lastEmail.at,
      });
  }
  // Oldest wait first within each kind.
  items.sort(
    (x, y) =>
      QUEUE_KINDS.indexOf(x.kind) - QUEUE_KINDS.indexOf(y.kind) ||
      time(x.since) - time(y.since),
  );

  return {
    items,
    openings: openings.map((o) => ({
      id: o.id,
      title: o.title,
      hiringLeadId: o.hiringLeadId ?? null,
      replyToLead: o.replyToLead ?? true,
      task: o.task ?? null,
      companyId: o.companyId,
    })),
  };
}
