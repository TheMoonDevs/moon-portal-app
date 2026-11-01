import { db } from '@/lib/mongodb/db-client';
import { fail, ok, requireCompanyPermission } from '@/lib/workspace/server';
import type { HiringSkill } from '@/models/hiring';

export const dynamic = 'force-dynamic';

/** Removes a saved skill; a built-in with its name shows again. */
export async function DELETE(
  _request: Request,
  { params }: { params: { skillId: string } },
) {
  const skill: HiringSkill | null = await db.hiringSkill.findFirst({
    where: { id: params.skillId },
  });
  const { response, user } = await requireCompanyPermission(
    skill?.companyId ?? null,
    'hiring:edit',
  );
  if (user && !skill) return fail(404, 'Skill not found.');
  if (response || !skill)
    return response ?? fail(401, 'Authentication required.');
  await db.hiringSkill.delete({ where: { id: skill.id } });
  return ok({ id: skill.id });
}
