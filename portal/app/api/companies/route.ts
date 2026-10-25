import type { NextRequest } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { requireSuperAdmin } from '@/lib/permissions/server';
import {
  fail,
  getWorkspaceForUser,
  nowIso,
  ok,
  requireUser,
  seedCompanyRoles,
  slugify,
} from '@/lib/workspace/server';
import { COMPANY_STATUS, MEMBER_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

/** Companies the caller can see (all of them for admins). */
export async function GET(request: NextRequest) {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const includeArchived =
    request.nextUrl.searchParams.get('includeArchived') === 'true';
  const companies = await getWorkspaceForUser(user, { includeArchived });
  return ok({ companies });
}

/**
 * Create a company. Super admin only: this check cannot be granted, and is not
 * affected by PERMISSIONS_MODE or the API key.
 */
export async function POST(request: Request) {
  const { response, user } = await requireSuperAdmin();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return fail(400, 'Company name is required.');

  let slug = slugify(body.slug || name);
  if (await db.company.findFirst({ where: { slug } })) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const createdAt = nowIso();
  const company = await db.company.create({
    data: {
      name,
      slug,
      description: body.description ?? null,
      logo: body.logo ?? null,
      color: body.color ?? null,
      status: COMPANY_STATUS.ACTIVE,
      createdById: user.id,
      createdAt,
      updatedAt: createdAt,
    },
  });

  await seedCompanyRoles(company.id);

  // The creator, and an optional owner picked in the form, start as owners.
  const ownerIds = Array.from(
    new Set([user.id, ...(body.ownerId ? [String(body.ownerId)] : [])]),
  );
  await db.companyMember.createMany({
    data: ownerIds.map((userId) => ({
      companyId: company.id,
      userId,
      roleKeys: ['owner'],
      status: MEMBER_STATUS.ACTIVE,
      joinedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    })),
  });

  return ok({ company }, { status: 201 });
}
