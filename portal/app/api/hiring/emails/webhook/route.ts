import {
  emailSettings,
  isStatusAhead,
  verifyWebhook,
  WEBHOOK_STATUS,
} from '@/lib/hiring/email';
import { db } from '@/lib/mongodb/db-client';
import { fail, nowIso, ok } from '@/lib/workspace/server';
import type { HiringEmail } from '@/models/hiring';
import { HIRING_EMAIL_STATUS } from '@/models/hiring';

export const dynamic = 'force-dynamic';

/**
 * Delivery updates from Resend. Point a Resend webhook at this path and put
 * its signing secret in RESEND_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  if (!emailSettings().tracksDelivery)
    return fail(404, 'Delivery tracking is not set up.');

  const raw = await request.text();
  if (!verifyWebhook(raw, request.headers))
    return fail(401, 'Invalid signature.');

  let event: {
    type?: string;
    created_at?: string;
    data?: { email_id?: string; bounce?: { message?: string } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return fail(400, 'Invalid JSON.');
  }

  const status = event.type ? WEBHOOK_STATUS[event.type] : undefined;
  const resendId = event.data?.email_id;
  // Anything else is acknowledged so Resend doesn't keep retrying it.
  if (!status || !resendId) return ok({ ignored: true });

  const email: HiringEmail | null = await db.hiringEmail.findFirst({
    where: { resendId },
  });
  if (!email) return ok({ ignored: true });

  const at = typeof event.created_at === 'string' ? event.created_at : nowIso();
  const ahead = isStatusAhead(status, email.status);
  const failed =
    status === HIRING_EMAIL_STATUS.BOUNCED ||
    status === HIRING_EMAIL_STATUS.FAILED;

  await db.hiringEmail.update({
    where: { id: email.id },
    data: {
      ...(ahead ? { status } : {}),
      ...(ahead && failed && event.data?.bounce?.message
        ? { error: event.data.bounce.message.slice(0, 500) }
        : {}),
      updatedAt: nowIso(),
      events: { push: { type: status, at } },
    },
  });
  if (ahead)
    await db.jobApplication.updateMany({
      where: { id: email.applicationId, 'lastEmail.id': email.id },
      data: { 'lastEmail.status': status },
    });

  return ok({ status: ahead ? status : email.status });
}
