import { type OutgoingEmail, sendEmails } from '@/lib/email/resend';
import { getOrCreateProfile, meetLink } from '@/lib/meet/server';
import { db } from '@/lib/mongodb/db-client';
import { asStringArray, nowIso } from '@/lib/workspace/server';
import type {
  APPLICATION_STAGE,
  ApplicationEvent,
  ApplicationLastEmail,
  HiringEmail,
  JobApplication,
  JobOpening,
} from '@/models/hiring';
import { HIRING_EMAIL_STATUS } from '@/models/hiring';

import {
  HIRING_EMAIL_TAGS,
  hiringEmailSettings,
  hiringFrom,
  HR_REPLY_TO,
} from './email';
import {
  emailVariables,
  MAX_BODY,
  MAX_RECIPIENTS,
  MAX_SUBJECT,
  renderEmail,
  usesMeetingLink,
  usesTaskLink,
} from './emailTemplates';
import { isValidEmail } from './forms';
import {
  ensureTaskToken,
  isStage,
  moveApplication,
  taskLinkFor,
} from './server';

/*
 * Emailing applicants, shared by the hiring tab's composer and the Claude
 * connector. Callers check the sender's `hiring:edit` permission first.
 */

export class HiringSendError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface HiringSend {
  ids: string[];
  /** May hold {{placeholders}}, filled in per applicant. */
  subject: string;
  body: string;
  /** One per message; repeating a send with it never sends twice. */
  sendId: string;
  templateId: string | null;
  moveTo: APPLICATION_STAGE | null;
  /** An exact reply-to address; wins over `replyToLead`. */
  replyTo: string | null;
  /**
   * True sends replies to each opening's hiring lead, false to the HR inbox.
   * Null follows each opening's own setting.
   */
  replyToLead: boolean | null;
}

/** Checks a send from an untrusted body. */
export function parseHiringSend(raw: Record<string, unknown>): {
  send: HiringSend;
  error: string | null;
} {
  const send: HiringSend = {
    ids: asStringArray(raw.ids),
    subject: typeof raw.subject === 'string' ? raw.subject.trim() : '',
    body: typeof raw.body === 'string' ? raw.body.trim() : '',
    sendId: typeof raw.sendId === 'string' ? raw.sendId : '',
    templateId:
      typeof raw.templateId === 'string' ? raw.templateId.slice(0, 80) : null,
    moveTo: isStage(raw.moveTo) ? raw.moveTo : null,
    replyTo:
      typeof raw.replyTo === 'string'
        ? raw.replyTo.trim().toLowerCase() || null
        : null,
    replyToLead: typeof raw.replyToLead === 'boolean' ? raw.replyToLead : null,
  };
  const error = !send.ids.length
    ? 'Choose at least one applicant.'
    : send.ids.length > MAX_RECIPIENTS
      ? `Send to at most ${MAX_RECIPIENTS} people at a time.`
      : !send.subject || send.subject.length > MAX_SUBJECT
        ? 'Add a subject of up to 200 characters.'
        : !send.body || send.body.length > MAX_BODY
          ? 'Write the email first.'
          : !/^[a-zA-Z0-9-]{8,64}$/.test(send.sendId)
            ? 'sendId is required.'
            : raw.moveTo && !send.moveTo
              ? 'Unknown stage.'
              : send.replyTo && !isValidEmail(send.replyTo)
                ? 'The reply-to address doesn’t look right.'
                : null;
  return { send, error };
}

type Sender = {
  id: string;
  email?: string | null;
  /** The portal's public origin, for {{meetingLink}} and {{taskLink}}. */
  origin?: string;
};

/** Every applicant's own copy, rendered but not sent. */
export async function renderHiringEmails(
  sender: Sender,
  applications: JobApplication[],
  send: HiringSend,
): Promise<OutgoingEmail[]> {
  const companyIds = Array.from(new Set(applications.map((a) => a.companyId)));
  if (companyIds.length !== 1)
    throw new HiringSendError(400, 'Email one company’s applicants at a time.');

  const meetingLink =
    sender.origin && usesMeetingLink(send.subject, send.body)
      ? meetLink(sender.origin, (await getOrCreateProfile(sender.id)).code)
      : null;

  const [company, user, openings] = await Promise.all([
    db.company.findFirst({ where: { id: companyIds[0] } }),
    db.user.findFirst({ where: { id: sender.id } }),
    db.jobOpening.findMany({
      where: {
        id: { in: Array.from(new Set(applications.map((a) => a.openingId))) },
      },
    }) as Promise<JobOpening[]>,
  ]);
  const companyName: string = company?.name ?? '';
  const roleOf = new Map(openings.map((o) => [o.id, o.title]));

  // Replies go to the opening's hiring lead, or the sender when it has none;
  // with that turned off they go to the HR inbox.
  const leadIds = Array.from(
    new Set(openings.map((o) => o.hiringLeadId).filter(Boolean)),
  ) as string[];
  const leads: Array<{ id: string; email?: string | null }> = leadIds.length
    ? await db.user.findMany({ where: { id: { in: leadIds } } })
    : [];
  const leadEmail = new Map(leads.map((l) => [l.id, l.email]));
  const senderEmail = user?.email || sender.email || null;
  const replyToFor = new Map(
    openings.map((o) => {
      if (send.replyTo) return [o.id, send.replyTo];
      const toLead = send.replyToLead ?? o.replyToLead ?? true;
      if (!toLead) return [o.id, HR_REPLY_TO];
      const lead = o.hiringLeadId ? leadEmail.get(o.hiringLeadId) : null;
      return [o.id, lead || senderEmail];
    }),
  );

  // Each candidate's own task page; the token is made the first time.
  const withTask = new Set(openings.filter((o) => o.task).map((o) => o.id));
  const taskLinks =
    sender.origin && usesTaskLink(send.subject, send.body)
      ? await Promise.all(
          applications.map(async (a) =>
            withTask.has(a.openingId)
              ? taskLinkFor(sender.origin!, await ensureTaskToken(a))
              : null,
          ),
        )
      : [];
  if (taskLinks.length && taskLinks.some((link) => !link))
    throw new HiringSendError(
      400,
      'This opening has no task yet. Add one in the opening editor before sending {{taskLink}}.',
    );
  const from = hiringFrom(companyName);

  return applications.map((application, i) => ({
    from,
    to: application.email,
    replyTo: replyToFor.get(application.openingId) ?? senderEmail,
    tags: HIRING_EMAIL_TAGS,
    ...renderEmail(
      { subject: send.subject, body: send.body },
      emailVariables({
        name: application.name,
        role: roleOf.get(application.openingId) ?? '',
        company: companyName,
        sender: user?.name || '',
        email: application.email,
        meetingLink,
        taskLink: taskLinks[i] ?? null,
      }),
    ),
  }));
}

// Sends in progress on this server, so a double click can't send twice.
const inFlight = new Set<string>();

export interface HiringSendResult {
  sent: number;
  failed: number;
  failures: Array<{ applicationId: string; name: string; error: string }>;
  /** Left out because they got the same subject a moment ago. */
  skipped: Array<{ applicationId: string; name: string }>;
  applications: JobApplication[];
}

/**
 * Sends `send` to every application, logs each email, notes it on the
 * application and, for those it reached, moves them to `send.moveTo`.
 *
 * With `skipRecentMs`, applicants who already got an email with the same
 * subject in that window are left out, for callers that can't keep a
 * sendId across retries.
 */
export async function deliverHiringEmails(
  sender: Sender,
  applications: JobApplication[],
  send: HiringSend,
  { skipRecentMs = 0 }: { skipRecentMs?: number } = {},
): Promise<HiringSendResult> {
  if (!hiringEmailSettings().configured)
    throw new HiringSendError(
      503,
      'Email isn’t set up yet. Add RESEND_API_KEY and RESEND_DOMAIN to the portal’s environment.',
    );
  if (
    inFlight.has(send.sendId) ||
    (await db.hiringEmail.count({ where: { sendId: send.sendId } }))
  )
    throw new HiringSendError(409, 'These emails were already sent.');
  inFlight.add(send.sendId);

  try {
    let outgoing = await renderHiringEmails(sender, applications, send);
    let skipped: HiringSendResult['skipped'] = [];

    if (skipRecentMs > 0) {
      const recent: HiringEmail[] = await db.hiringEmail.findMany({
        where: {
          applicationId: { in: applications.map((a) => a.id) },
          sentAt: { gte: new Date(Date.now() - skipRecentMs).toISOString() },
          status: { notIn: [HIRING_EMAIL_STATUS.FAILED] },
        },
        select: { applicationId: true, subject: true },
      });
      const isRepeat = (i: number) =>
        recent.some(
          (r) =>
            r.applicationId === applications[i].id &&
            r.subject === outgoing[i].subject,
        );
      skipped = applications
        .filter((_, i) => isRepeat(i))
        .map((a) => ({ applicationId: a.id, name: a.name }));
      const keep = applications.map((_, i) => !isRepeat(i));
      applications = applications.filter((_, i) => keep[i]);
      outgoing = outgoing.filter((_, i) => keep[i]);
    }

    const results = outgoing.length
      ? await sendEmails(outgoing, `hiring-${send.sendId}`)
      : [];
    const sentAt = nowIso();

    const records: HiringEmail[] = await Promise.all(
      applications.map((application, i) =>
        db.hiringEmail.create({
          data: {
            companyId: application.companyId,
            openingId: application.openingId,
            applicationId: application.id,
            sendId: send.sendId,
            to: outgoing[i].to,
            from: outgoing[i].from,
            replyTo: outgoing[i].replyTo ?? null,
            subject: outgoing[i].subject,
            text: outgoing[i].text,
            templateId: send.templateId,
            status: results[i].id
              ? HIRING_EMAIL_STATUS.SENT
              : HIRING_EMAIL_STATUS.FAILED,
            resendId: results[i].id ?? null,
            error: results[i].error ?? null,
            sentById: sender.id,
            sentAt,
            events: [],
            createdAt: sentAt,
            updatedAt: sentAt,
          },
        }),
      ),
    );

    const updated: JobApplication[] = await Promise.all(
      applications.map(async (application, i) => {
        const record = records[i];
        if (record.status === HIRING_EMAIL_STATUS.FAILED) return application;
        const event: ApplicationEvent = {
          type: 'EMAIL',
          at: sentAt,
          byUserId: sender.id,
          text: record.subject,
          emailId: record.id,
          templateId: send.templateId,
        };
        const lastEmail: ApplicationLastEmail = {
          id: record.id,
          subject: record.subject,
          status: record.status,
          at: sentAt,
          templateId: send.templateId,
        };
        // The due date counts from the first email with the task link.
        const taskSent =
          usesTaskLink(send.subject, send.body) && !application.taskSentAt;
        const emailed: JobApplication = await db.jobApplication.update({
          where: { id: application.id },
          data: {
            lastEmail,
            updatedAt: sentAt,
            history: { push: event },
            ...(taskSent && { taskSentAt: sentAt }),
          },
        });
        return send.moveTo
          ? moveApplication(emailed, send.moveTo, sender.id)
          : emailed;
      }),
    );

    const failures = records
      .map((record, i) => ({ record, application: applications[i] }))
      .filter(({ record }) => record.status === HIRING_EMAIL_STATUS.FAILED)
      .map(({ record, application }) => ({
        applicationId: application.id,
        name: application.name,
        error: record.error ?? 'Not sent.',
      }));

    return {
      sent: records.length - failures.length,
      failed: failures.length,
      failures,
      skipped,
      applications: updated,
    };
  } finally {
    inFlight.delete(send.sendId);
  }
}
