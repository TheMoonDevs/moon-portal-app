import type { NextRequest } from 'next/server';

import {
  listHiringSkills,
  saveHiringSkill,
  SkillError,
} from '@/lib/hiring/skills/server';
import { fail, ok, requireCompanyPermission } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/** The company's hiring skills (`?companyId=`), built-ins included. */
export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId');
  const { response, user } = await requireCompanyPermission(
    companyId,
    'hiring:read',
  );
  if (response || !user || !companyId)
    return response ?? fail(401, 'Authentication required.');
  return ok({ skills: await listHiringSkills(companyId) });
}

/**
 * Saves a skill: `{ companyId, body, tips? }`, where `body` is the whole
 * SKILL.md. One with the same name is replaced.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const companyId = typeof body.companyId === 'string' ? body.companyId : null;
  const { response, user } = await requireCompanyPermission(
    companyId,
    'hiring:edit',
  );
  if (response || !user || !companyId)
    return response ?? fail(401, 'Authentication required.');
  try {
    const { skill, created } = await saveHiringSkill(companyId, user.id, {
      body: body.body,
      tips: body.tips,
    });
    return ok({ skill }, { status: created ? 201 : 200 });
  } catch (err) {
    if (err instanceof SkillError) return fail(err.status, err.message);
    throw err;
  }
}
