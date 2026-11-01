import type { NextRequest } from 'next/server';

import { meetingHostFor } from '@/lib/hiring/sendEmails';
import { originOf } from '@/lib/mcp/tokens';
import { db } from '@/lib/mongodb/db-client';
import { fail, ok, requireCompanyPermission } from '@/lib/workspace/server';
import { MEMBER_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

/**
 * A company member's booking link (`?companyId=&userId=`), for the composer's
 * {{meetingLink}} preview when the email uses someone else's link, such as
 * the hiring lead's. It is made with the default hours on first use.
 */
export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId');
  const userId = request.nextUrl.searchParams.get('userId') ?? '';
  const { response, user } = await requireCompanyPermission(
    companyId,
    'hiring:read',
  );
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(userId))
    return fail(400, 'userId is required.');
  if (
    userId !== user.id &&
    !(await db.companyMember.count({
      where: { companyId, userId, status: MEMBER_STATUS.ACTIVE },
    }))
  )
    return fail(404, 'They aren’t a member of this company.');
  return ok({ host: await meetingHostFor(originOf(request), userId) });
}
