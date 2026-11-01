import { HiringSendError, resendHiringEmail } from '@/lib/hiring/sendEmails';
import { requireApplicationPermission } from '@/lib/hiring/server';
import { db } from '@/lib/mongodb/db-client';
import { fail, ok } from '@/lib/workspace/server';
import type { HiringEmail } from '@/models/hiring';

export const dynamic = 'force-dynamic';

/**
 * Sends an email a candidate already got once more, word for word:
 * `{ emailId, sendId }`. `sendId` is made by the client once per click, so
 * repeating the request never sends twice.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const emailId = typeof body.emailId === 'string' ? body.emailId : '';
  const sendId = typeof body.sendId === 'string' ? body.sendId : '';
  if (!emailId) return fail(400, 'emailId is required.');

  const email: HiringEmail | null = await db.hiringEmail.findFirst({
    where: { id: emailId },
  });
  if (!email) return fail(404, 'Email not found.');
  const { response, user, application } = await requireApplicationPermission(
    email.applicationId,
    'hiring:edit',
  );
  if (response || !user || !application)
    return response ?? fail(401, 'Authentication required.');

  try {
    return ok(await resendHiringEmail(user, email, application, sendId));
  } catch (err) {
    if (err instanceof HiringSendError) return fail(err.status, err.message);
    throw err;
  }
}
