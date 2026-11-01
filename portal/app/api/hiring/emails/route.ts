import type { NextRequest } from 'next/server';

import {
  deliverHiringEmails,
  HiringSendError,
  parseHiringSend,
} from '@/lib/hiring/sendEmails';
import { requireApplicationPermission } from '@/lib/hiring/server';
import { originOf } from '@/lib/mcp/tokens';
import { db } from '@/lib/mongodb/db-client';
import { fail, ok, requireCompanyPermission } from '@/lib/workspace/server';
import type { HiringEmail, JobApplication } from '@/models/hiring';
import { HIRING_EMAIL_STATUS } from '@/models/hiring';

export const dynamic = 'force-dynamic';
// Five batches of 100 at most; give Resend room to answer.
export const maxDuration = 60;

const MAX_LOG = 500;

/**
 * Emails sent to one applicant (`?applicationId=`), newest first; or the
 * company's sent mail across every opening (`?companyId=`, optionally
 * `&status=BOUNCED,FAILED` and `&openingId=`), newest first, up to 500.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const applicationId = params.get('applicationId');
  const companyId = params.get('companyId');

  if (!applicationId && companyId) {
    const { response, user } = await requireCompanyPermission(
      companyId,
      'hiring:read',
    );
    if (response || !user)
      return response ?? fail(401, 'Authentication required.');
    const statuses = (params.get('status') ?? '')
      .split(',')
      .filter((s): s is HIRING_EMAIL_STATUS =>
        Object.values(HIRING_EMAIL_STATUS).includes(s as HIRING_EMAIL_STATUS),
      );
    const openingId = params.get('openingId');
    const emails: HiringEmail[] = await db.hiringEmail.findMany({
      where: {
        companyId,
        ...(statuses.length && { status: { in: statuses } }),
        ...(openingId && { openingId }),
      },
      orderBy: { sentAt: 'desc' },
      take: MAX_LOG,
    });
    const applicationIds = Array.from(
      new Set(emails.map((e) => e.applicationId)),
    );
    const applications: Array<{
      id: string;
      name: string;
      stage: string;
      openingId: string;
    }> = applicationIds.length
      ? await db.jobApplication.findMany({
          where: { id: { in: applicationIds } },
          select: { id: true, name: true, stage: true, openingId: true },
        })
      : [];
    return ok({ emails, applications });
  }
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

/**
 * Emails applicants of one company:
 * `{ ids, subject, body, sendId, templateId?, moveTo?, replyToLead?,
 *   meetingLinkFrom? }`. `meetingLinkFrom` picks whose booking link fills
 * {{meetingLink}}: `lead`, `sender` (the default) or a member's user id.
 *
 * `subject` and `body` may hold {{placeholders}}. Each applicant who was
 * emailed is moved to `moveTo` when it is given. `sendId` is made by the
 * client once per message, so repeating a request never sends twice.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { send, error } = parseHiringSend(body);
  if (error) return fail(400, error);

  const applications: JobApplication[] = await db.jobApplication.findMany({
    where: { id: { in: send.ids } },
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

  try {
    return ok(
      await deliverHiringEmails(
        { ...user, origin: originOf(request) },
        applications,
        send,
      ),
    );
  } catch (err) {
    if (err instanceof HiringSendError) return fail(err.status, err.message);
    throw err;
  }
}
