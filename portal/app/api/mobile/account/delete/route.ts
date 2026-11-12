import { revokeMobileToken } from '@/lib/mobile/auth';
import { mobileProfile, requireMobileToken } from '@/lib/mobile/server';
import { db } from '@/lib/mongodb/db-client';
import { ensureNotificationsReset } from '@/lib/notifications/server';
import { SUPER_ADMIN_EMAILS } from '@/lib/permissions/superAdmin';
import { sendPushToUsers } from '@/lib/push/server';
import { ok } from '@/lib/workspace/server';
import { NotificationType } from '@/models/shared/enums';

export const dynamic = 'force-dynamic';

/*
 * "Delete my account" in the mobile app, which both app stores require.
 * Portal accounts hold company records (worklogs, agreements, payslips), so
 * the app asks for deletion instead of deleting on the spot: it notes the
 * request on the account, tells the admins, and signs this phone out. An
 * admin then deletes the account on the website (DELETE /api/user).
 */
export async function POST(request: Request) {
  const { response, found } = await requireMobileToken(request);
  if (response || !found) return response;
  const body = await request.json().catch(() => ({}));
  const reason =
    typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : '';

  const now = new Date();
  const user = await db.user.update({
    where: { id: found.user.id },
    data: { deletionRequestedAt: now.toISOString(), updatedAt: now },
  });

  const admins: { id: string; email?: string | null }[] =
    await db.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ isAdmin: true }, { email: { in: [...SUPER_ADMIN_EMAILS] } }],
      },
      select: { id: true, email: true },
    });
  const adminIds = admins.map((a) => a.id).filter((id) => id !== user.id);
  const name = user.name || user.username || 'Someone';
  if (adminIds.length) {
    await ensureNotificationsReset();
    await db.notification.createMany({
      data: adminIds.map((userId) => ({
        userId,
        title: 'Account deletion request',
        description: `${name} asked for their account to be deleted from the mobile app.${
          reason ? ` Reason: ${reason}` : ''
        }`,
        matchId: user.id,
        matchType: 'User',
        notificationType: NotificationType.USER_TO_USER,
        notificationData: {
          kind: 'account-deletion',
          actions: [
            { title: 'Open admin', trigger_type: 'link', trigger: '/admin' },
          ],
        },
        isRead: false,
        createdAt: now,
        updatedAt: now,
      })),
    });
    await sendPushToUsers(adminIds, {
      title: 'Account deletion request',
      body: `${name} asked for their account to be deleted.`,
      url: '/admin',
      tag: `account-deletion-${user.id}`,
    }).catch(() => null);
  }

  await revokeMobileToken(found.token);
  return ok({ user: mobileProfile(user), requestedAt: now.toISOString() });
}
