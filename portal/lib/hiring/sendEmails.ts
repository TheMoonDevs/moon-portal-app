import { type OutgoingEmail, sendEmail, sendEmails } from '@/lib/email/resend';
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
import type { MeetProfile } from '@/models/meet';
import { MEMBER_STATUS } from '@/models/workspace';

import {
  HIRING_EMAIL_TAGS,
  hiringEmailSettings,
  hiringFrom,
  HR_REPLY_TO,
} from './email';
import {
  emailHtml,
  emailVariables,
  formatTaskDue,
  MAX_BODY,
  MAX_RECIPIENTS,
  MAX_SUBJECT,
  renderEmail,
  usesMeetingLink,
  usesTaskDue,
  usesTaskLink,
} from './emailTemplates';
import { isValidEmail } from './forms';
import {
  ensureTaskToken,
  isStage,
  moveApplication,
  taskLinkFor,
} from './server';
import { applicationDueAt } from './tasks';

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
  /**
   * Whose booking link fills {{meetingLink}}: `lead` for each opening's
   * hiring lead, `sender` for the person sending (also when null), or a
   * company member's user id.
   */
  meetingLinkFrom: string | null;
}

const MEETING_LINK_FROM = /^(lead|sender|[A-Za-z0-9_-]{1,64})$/;

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
    meetingLinkFrom:
      typeof raw.meetingLinkFrom === 'string' &&
      MEETING_LINK_FROM.test(raw.meetingLinkFrom)
        ? raw.meetingLinkFrom
        : null,
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

/** Whose booking link {{meetingLink}} gives candidates of one opening. */
export interface MeetingHost {
  userId: string;
  name: string;
  link: string;
  /** True when their booking page was just made, with the default hours. */
  isNew: boolean;
}

/** A member's booking link, made with the default hours on first use. */
export async function meetingHostFor(
  origin: string,
  userId: string,
): Promise<MeetingHost> {
  const existing: MeetProfile | null = await db.meetProfile.findFirst({
    where: { userId },
  });
  const profile = existing ?? (await getOrCreateProfile(userId));
  const person = (await db.user.findFirst({
    where: { id: userId },
    select: { name: true, email: true },
  })) as { name?: string | null; email?: string | null } | null;
  return {
    userId,
    name: person?.name || person?.email || 'A teammate',
    link: meetLink(origin, profile.code),
    isNew: !existing,
  };
}

/**
 * The booking link each opening's candidates get for {{meetingLink}}, by
 * opening id, following `from` (see HiringSend.meetingLinkFrom).
 */
export async function resolveMeetingHosts(
  sender: Sender,
  companyId: string,
  openings: Pick<JobOpening, 'id' | 'title' | 'hiringLeadId'>[],
  from: string | null,
): Promise<Map<string, MeetingHost>> {
  const out = new Map<string, MeetingHost>();
  if (!sender.origin) return out;
  const hostOf = (o: Pick<JobOpening, 'title' | 'hiringLeadId'>) => {
    if (!from || from === 'sender') return sender.id;
    if (from === 'lead') {
      if (!o.hiringLeadId)
        throw new HiringSendError(
          400,
          `${o.title} has no hiring lead to take the meeting link from. Assign one, or use your own link.`,
        );
      return o.hiringLeadId;
    }
    return from;
  };
  const hostIds = new Map(openings.map((o) => [o.id, hostOf(o)]));
  const unique = Array.from(new Set(Array.from(hostIds.values())));
  const others = unique.filter((id) => id !== sender.id);
  if (others.length) {
    const members = await db.companyMember.count({
      where: {
        companyId,
        userId: { in: others },
        status: MEMBER_STATUS.ACTIVE,
      },
    });
    if (members !== others.length)
      throw new HiringSendError(
        400,
        'The meeting link has to be a company member’s.',
      );
  }
  const hosts = new Map(
    await Promise.all(
      unique.map(
        async (id) => [id, await meetingHostFor(sender.origin!, id)] as const,
      ),
    ),
  );
  hostIds.forEach((hostId, openingId) =>
    out.set(openingId, hosts.get(hostId)!),
  );
  return out;
}

/** Every applicant's own copy, rendered but not sent. */
export async function renderHiringEmails(
  sender: Sender,
  applications: JobApplication[],
  send: HiringSend,
): Promise<OutgoingEmail[]> {
  const companyIds = Array.from(new Set(applications.map((a) => a.companyId)));
  if (companyIds.length !== 1)
    throw new HiringSendError(400, 'Email one company’s applicants at a time.');

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
  const openingById = new Map(openings.map((o) => [o.id, o]));

  const meetingHosts = usesMeetingLink(send.subject, send.body)
    ? await resolveMeetingHosts(
        sender,
        companyIds[0],
        openings,
        send.meetingLinkFrom,
      )
    : new Map<string, MeetingHost>();

  // When each candidate's task is due; a first task email starts the clock.
  const now = nowIso();
  const taskDues = usesTaskDue(send.subject, send.body)
    ? applications.map((a) => {
        const due = applicationDueAt(openingById.get(a.openingId)?.task, {
          taskSentAt: a.taskSentAt ?? now,
          taskDueOverride: a.taskDueOverride,
        });
        return due ? formatTaskDue(due) : null;
      })
    : [];
  const noDue = applications.filter((_, i) => taskDues.length && !taskDues[i]);
  if (noDue.length)
    throw new HiringSendError(
      400,
      `${noDue
        .slice(0, 3)
        .map((a) => a.name)
        .join(
          ', ',
        )}${noDue.length > 3 ? ` and ${noDue.length - 3} more` : ''} ${noDue.length === 1 ? 'has' : 'have'} no task due date for {{taskDue}}. Give the task due days, or extend their task to a date.`,
    );

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
        meetingLink: meetingHosts.get(application.openingId)?.link ?? null,
        taskLink: taskLinks[i] ?? null,
        taskDue: taskDues[i] ?? null,
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

const FOOTER_MARK = '\n\n--\n';

/**
 * Sends an email a candidate already got once more, word for word, e.g. when
 * it bounced or they say they never saw it. It is logged as a new email.
 * `sendId` stops a double send, as in deliverHiringEmails.
 */
export async function resendHiringEmail(
  sender: Pick<Sender, 'id'>,
  email: HiringEmail,
  application: JobApplication,
  sendId: string,
): Promise<{ email: HiringEmail; application: JobApplication }> {
  if (!hiringEmailSettings().configured)
    throw new HiringSendError(
      503,
      'Email isn’t set up yet. Add RESEND_API_KEY and RESEND_DOMAIN to the portal’s environment.',
    );
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(sendId))
    throw new HiringSendError(400, 'sendId is required.');
  if (
    inFlight.has(sendId) ||
    (await db.hiringEmail.count({ where: { sendId } }))
  )
    throw new HiringSendError(409, 'This email was already sent again.');
  inFlight.add(sendId);

  try {
    // The stored text ends with the footer; the HTML shows it under the card.
    const cut = email.text.lastIndexOf(FOOTER_MARK);
    const body = cut >= 0 ? email.text.slice(0, cut) : email.text;
    const footer = cut >= 0 ? email.text.slice(cut + FOOTER_MARK.length) : '';
    // Send to the address on the application now, in case it was corrected.
    const outgoing: OutgoingEmail = {
      from: email.from,
      to: application.email || email.to,
      replyTo: email.replyTo ?? null,
      subject: email.subject,
      text: email.text,
      html: emailHtml(body, footer),
      tags: HIRING_EMAIL_TAGS,
    };
    const result = await sendEmail(outgoing, `hiring-${sendId}`);
    const sentAt = nowIso();
    const record: HiringEmail = await db.hiringEmail.create({
      data: {
        companyId: email.companyId,
        openingId: email.openingId,
        applicationId: email.applicationId,
        sendId,
        to: outgoing.to,
        from: outgoing.from,
        replyTo: outgoing.replyTo ?? null,
        subject: outgoing.subject,
        text: outgoing.text,
        templateId: email.templateId ?? null,
        status: result.id
          ? HIRING_EMAIL_STATUS.SENT
          : HIRING_EMAIL_STATUS.FAILED,
        resendId: result.id ?? null,
        error: result.error ?? null,
        sentById: sender.id,
        sentAt,
        events: [],
        createdAt: sentAt,
        updatedAt: sentAt,
      },
    });
    if (record.status === HIRING_EMAIL_STATUS.FAILED)
      throw new HiringSendError(
        502,
        `It wasn’t sent: ${record.error ?? 'the email service said no.'}`,
      );
    const event: ApplicationEvent = {
      type: 'EMAIL',
      at: sentAt,
      byUserId: sender.id,
      text: record.subject,
      emailId: record.id,
      templateId: record.templateId ?? null,
    };
    const lastEmail: ApplicationLastEmail = {
      id: record.id,
      subject: record.subject,
      status: record.status,
      at: sentAt,
      templateId: record.templateId ?? null,
    };
    const updated: JobApplication = await db.jobApplication.update({
      where: { id: application.id },
      data: { lastEmail, updatedAt: sentAt, history: { push: event } },
    });
    return { email: record, application: updated };
  } finally {
    inFlight.delete(sendId);
  }
}
