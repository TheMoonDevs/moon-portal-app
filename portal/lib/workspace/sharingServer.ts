import { db } from '@/lib/mongodb/db-client';
import type { CompanyMember } from '@/models/workspace';
import { MEMBER_STATUS } from '@/models/workspace';

import type { SharingViewer } from './sharing';

/**
 * Who is looking, for the sharing rules in ./sharing: their id, and the
 * companies they own (owners see every page and plan there).
 */
export async function sharingViewer(user: {
  id: string;
  isAdmin?: boolean | null;
}): Promise<SharingViewer> {
  const memberships: Pick<CompanyMember, 'companyId' | 'roleKeys'>[] =
    await db.companyMember.findMany({
      where: { userId: user.id, status: MEMBER_STATUS.ACTIVE },
      select: { companyId: true, roleKeys: true },
    });
  return {
    id: user.id,
    isAdmin: !!user.isAdmin,
    ownerOf: new Set(
      memberships
        .filter((m) => (m.roleKeys ?? []).includes('owner'))
        .map((m) => m.companyId),
    ),
  };
}

/** The ids of a company's active members: who an item can be shared with. */
export async function companyMemberIds(companyId: string) {
  const members: Pick<CompanyMember, 'userId'>[] =
    await db.companyMember.findMany({
      where: { companyId, status: MEMBER_STATUS.ACTIVE },
      select: { userId: true },
    });
  return new Set(members.map((m) => m.userId));
}
