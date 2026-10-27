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

/**
 * Emails applicants of one company:
 * `{ ids, subject, body, sendId, templateId?, moveTo?, replyToLead? }`.
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
