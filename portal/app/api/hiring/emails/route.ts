import type { NextRequest } from 'next/server';

import { type OutgoingEmail, sendEmails } from '@/lib/email/resend';
import {
  HIRING_EMAIL_TAGS,
  hiringEmailSettings,
  hiringFrom,
} from '@/lib/hiring/email';
import {
  emailVariables,
  MAX_BODY,
  MAX_RECIPIENTS,
  MAX_SUBJECT,
  renderEmail,
} from '@/lib/hiring/emailTemplates';
import { isValidEmail } from '@/lib/hiring/forms';
import {
  isStage,
  moveApplication,
  requireApplicationPermission,
} from '@/lib/hiring/server';
import { db } from '@/lib/mongodb/db-client';
import {
  asStringArray,
  fail,
  nowIso,
  ok,
  requireCompanyPermission,
} from '@/lib/workspace/server';
import type {
  ApplicationEvent,
  ApplicationLastEmail,
  HiringEmail,
  JobApplication,
  JobOpening,
} from '@/models/hiring';
import { HIRING_EMAIL_STATUS } from '@/models/hiring';

export const dynamic = 'force-dynamic';
// Five batches of 100 at most; give Resend room to answer.
export const maxDuration = 60;

/** Emails sent to one applicant (`?applicationId=`), newest first. */
export async function GET(request: NextRequest) {
  const applicationId = request.nextUrl.searchParams.get('applicationId');
  if (!applicationId) return fail(400, 'applicationId is required.');

  const { response, application } = await requireApplicationPermission(
    applicationId,
    'hiring:read',
  );
  if (response || !application)
    return response ?? fail(401, 'Authentication required.');

  const emails: HiringEmail[] = await db.hiringEmail.findMany({
    where: { applicationId: application.id },
    orderBy: { sentAt: 'desc' },
  });
  return ok({ emails });
}

// Sends in progress on this server, so a double click can't send twice.
const inFlight = new Set<string>();

/**
 * Emails applicants of one company:
 * `{ ids, subject, body, sendId, templateId?, moveTo?, replyTo? }`.
 *
 * `subject` and `body` may hold {{placeholders}}. Each applicant who was
 * emailed is moved to `moveTo` when it is given. `sendId` is made by the
 * client once per message, so repeating a request never sends twice.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const ids = asStringArray(body.ids);
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  const sendId = typeof body.sendId === 'string' ? body.sendId : '';
  const replyTo =
    typeof body.replyTo === 'string' ? body.replyTo.trim().toLowerCase() : '';
  const templateId =
    typeof body.templateId === 'string' ? body.templateId.slice(0, 80) : null;

  if (!ids.length) return fail(400, 'Choose at least one applicant.');
  if (ids.length > MAX_RECIPIENTS)
    return fail(400, `Send to at most ${MAX_RECIPIENTS} people at a time.`);
  if (!subject || subject.length > MAX_SUBJECT)
    return fail(400, 'Add a subject of up to 200 characters.');
  if (!text || text.length > MAX_BODY)
    return fail(400, 'Write the email first.');
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(sendId))
    return fail(400, 'sendId is required.');
  if (body.moveTo && !isStage(body.moveTo)) return fail(400, 'Unknown stage.');
  if (replyTo && !isValidEmail(replyTo))
    return fail(400, 'The reply-to address doesn’t look right.');

  const applications: JobApplication[] = await db.jobApplication.findMany({
    where: { id: { in: ids } },
  });
  if (!applications.length) return fail(404, 'No applicants found.');

  const companyIds = Array.from(new Set(applications.map((a) => a.companyId)));
  if (companyIds.length > 1)
    return fail(400, 'Email one company’s applicants at a time.');
  const { response, user } = await requireCompanyPermission(
    companyIds[0],
    'hiring:edit',
  );
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  if (!hiringEmailSettings().configured)
    return fail(
      503,
      'Email isn’t set up yet. Add RESEND_API_KEY and RESEND_DOMAIN to the portal’s environment.',
    );

  if (
    inFlight.has(sendId) ||
    (await db.hiringEmail.count({ where: { sendId } }))
  )
    return fail(409, 'These emails were already sent.');
  inFlight.add(sendId);

  try {
    const [company, sender, openings] = await Promise.all([
      db.company.findFirst({ where: { id: companyIds[0] } }),
      db.user.findFirst({ where: { id: user.id } }),
      db.jobOpening.findMany({
        where: {
          id: { in: Array.from(new Set(applications.map((a) => a.openingId))) },
        },
      }) as Promise<JobOpening[]>,
    ]);
    const companyName: string = company?.name ?? '';
    const roleOf = new Map(openings.map((o) => [o.id, o.title]));
    const from = hiringFrom(companyName);
    const reply = replyTo || sender?.email || user.email || null;

    const outgoing: OutgoingEmail[] = applications.map((application) => {
      const rendered = renderEmail(
        { subject, body: text },
        emailVariables({
          name: application.name,
          role: roleOf.get(application.openingId) ?? '',
          company: companyName,
          sender: sender?.name || '',
        }),
      );
      return {
        from,
        to: application.email,
        replyTo: reply,
        tags: HIRING_EMAIL_TAGS,
        ...rendered,
      };
    });

    const results = await sendEmails(outgoing, `hiring-${sendId}`);
    const sentAt = nowIso();

    const records: HiringEmail[] = await Promise.all(
      applications.map((application, i) =>
        db.hiringEmail.create({
          data: {
            companyId: application.companyId,
            openingId: application.openingId,
            applicationId: application.id,
            sendId,
            to: outgoing[i].to,
            from,
            replyTo: reply,
            subject: outgoing[i].subject,
            text: outgoing[i].text,
            templateId,
            status: results[i].id
              ? HIRING_EMAIL_STATUS.SENT
              : HIRING_EMAIL_STATUS.FAILED,
            resendId: results[i].id ?? null,
            error: results[i].error ?? null,
            sentById: user.id,
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
          byUserId: user.id,
          text: record.subject,
          emailId: record.id,
          templateId,
        };
        const lastEmail: ApplicationLastEmail = {
          id: record.id,
          subject: record.subject,
          status: record.status,
          at: sentAt,
          templateId,
        };
        const emailed: JobApplication = await db.jobApplication.update({
          where: { id: application.id },
          data: { lastEmail, updatedAt: sentAt, history: { push: event } },
        });
        return isStage(body.moveTo)
          ? moveApplication(emailed, body.moveTo, user.id)
          : emailed;
      }),
    );

    const failures = records
      .map((record, i) => ({ record, application: applications[i] }))
      .filter(({ record }) => record.status === HIRING_EMAIL_STATUS.FAILED)
      .map(({ record, application }) => ({
        applicationId: application.id,
        name: application.name,
        error: record.error,
      }));

    return ok({
      sent: records.length - failures.length,
      failed: failures.length,
      failures,
      applications: updated,
    });
  } finally {
    inFlight.delete(sendId);
  }
}
