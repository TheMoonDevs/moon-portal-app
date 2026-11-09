import { db } from '@/lib/mongodb/db-client';
import { nowIso } from '@/lib/workspace/server';
import type { JobApplication, JobOpening } from '@/models/hiring';
import { APPLICATION_STAGE, JOB_OPENING_STATUS } from '@/models/hiring';

import { portalOrigin } from './digest';
import { QUICK_ACTION_TEMPLATES, starterById } from './emailTemplates';
import { deliverHiringEmails, HiringSendError } from './sendEmails';
import { applicationDueAt, taskSeen } from './tasks';

/*
 * Task follow-ups the portal sends on its own, each morning with the hiring
 * digest, for openings that turn them on (JobOpening.followUps):
 *
 * - a "did it reach you?" check-in to people who haven't opened the task
 *   email or the task page some days after it was sent,
 * - a reminder on the day before the task is due,
 * - after a grace period past the due date, the "task not sent" email to
 *   people who sent nothing, which moves them to Rejected.
 *
 * Each one goes once per candidate: the application remembers it, and the
 * send id is the same on every run, so a repeat never sends twice.
 */

export type FollowUpKind = 'NUDGE' | 'REMIND' | 'REJECT';

const DAY_MS = 86_400_000;

const TEMPLATE: Record<FollowUpKind, string> = {
  NUDGE: QUICK_ACTION_TEMPLATES.taskCheckIn,
  REMIND: QUICK_ACTION_TEMPLATES.reminder,
  REJECT: QUICK_ACTION_TEMPLATES.rejectNoTask,
};

const MARK: Record<FollowUpKind, 'nudgedAt' | 'remindedAt' | 'rejectedAt'> = {
  NUDGE: 'nudgedAt',
  REMIND: 'remindedAt',
  REJECT: 'rejectedAt',
};

const time = (value: unknown) => {
  const t = new Date(String(value ?? '')).getTime();
  return Number.isFinite(t) ? t : null;
};

/** Which follow-up, if any, is due for one applicant right now. */
export function followUpDue(
  opening: Pick<JobOpening, 'task' | 'followUps'>,
  a: JobApplication,
  now = new Date(),
): FollowUpKind | null {
  const rules = opening.followUps;
  if (!rules || !opening.task) return null;
  if (a.stage !== APPLICATION_STAGE.TASK || a.taskSubmission) return null;
  const sentAt = time(a.taskSentAt);
  if (!sentAt) return null;
  const done = a.followUps ?? {};
  const due = applicationDueAt(opening.task, a);
  const nowMs = now.getTime();

  if (
    rules.rejectNoShowDays &&
    due &&
    !done.rejectedAt &&
    nowMs >= due.getTime() + rules.rejectNoShowDays * DAY_MS
  )
    return 'REJECT';
  if (
    rules.remindBeforeDue &&
    due &&
    !done.remindedAt &&
    due.getTime() > nowMs &&
    due.getTime() - nowMs <= DAY_MS * 1.5
  )
    return 'REMIND';
  if (
    rules.nudgeUnopenedDays &&
    !done.nudgedAt &&
    !taskSeen(a) &&
    nowMs >= sentAt + rules.nudgeUnopenedDays * DAY_MS &&
    (!due || due.getTime() > nowMs)
  )
    return 'NUDGE';
  return null;
}

export interface FollowUpResult {
  checked: number;
  sent: Array<{
    kind: FollowUpKind;
    applicationId: string;
    name: string;
    opening: string;
  }>;
  failed: Array<{ applicationId: string; name: string; error: string }>;
}

/** Sends every follow-up that is due, or with `dryRun` lists them. */
export async function runHiringFollowUps({
  dryRun = false,
  now = new Date(),
}: { dryRun?: boolean; now?: Date } = {}): Promise<FollowUpResult> {
  const result: FollowUpResult = { checked: 0, sent: [], failed: [] };
  const openings: JobOpening[] = await db.jobOpening.findMany({
    where: {
      status: { in: [JOB_OPENING_STATUS.OPEN, JOB_OPENING_STATUS.CLOSED] },
    },
  });
  const withRules = openings.filter((o) => o.followUps && o.task);
  if (!withRules.length) return result;

  const applications: JobApplication[] = await db.jobApplication.findMany({
    where: {
      openingId: { in: withRules.map((o) => o.id) },
      stage: APPLICATION_STAGE.TASK,
    },
  });
  const senderIds = Array.from(
    new Set(withRules.map((o) => o.hiringLeadId || o.createdById)),
  );
  const senders: Array<{ id: string; email?: string | null }> =
    await db.user.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, email: true },
    });
  const origin = portalOrigin();

  for (const opening of withRules) {
    const senderId = opening.hiringLeadId || opening.createdById;
    const sender = senders.find((u) => u.id === senderId) ?? { id: senderId };
    for (const a of applications.filter((x) => x.openingId === opening.id)) {
      result.checked += 1;
      const kind = followUpDue(opening, a, now);
      if (!kind) continue;
      const template = starterById(TEMPLATE[kind]);
      if (!template) continue;
      const entry = {
        kind,
        applicationId: a.id,
        name: a.name,
        opening: opening.title,
      };
      if (dryRun) {
        result.sent.push(entry);
        continue;
      }
      try {
        const sent = await deliverHiringEmails({ ...sender, origin }, [a], {
          ids: [a.id],
          subject: template.subject,
          body: template.body,
          sendId: `auto-${kind.toLowerCase()}-${a.id}`,
          templateId: TEMPLATE[kind],
          moveTo: kind === 'REJECT' ? APPLICATION_STAGE.REJECTED : null,
          replyTo: null,
          replyToLead: null,
          meetingLinkFrom: null,
        });
        if (sent.failed) {
          result.failed.push({
            applicationId: a.id,
            name: a.name,
            error: sent.failures[0]?.error ?? 'Not sent.',
          });
          continue;
        }
        result.sent.push(entry);
      } catch (err) {
        // 409: this exact follow-up went out before; just remember it.
        if (!(err instanceof HiringSendError && err.status === 409)) {
          result.failed.push({
            applicationId: a.id,
            name: a.name,
            error: err instanceof Error ? err.message : 'Not sent.',
          });
          continue;
        }
      }
      await db.jobApplication.update({
        where: { id: a.id },
        data: { followUps: { ...(a.followUps ?? {}), [MARK[kind]]: nowIso() } },
      });
    }
  }
  return result;
}
