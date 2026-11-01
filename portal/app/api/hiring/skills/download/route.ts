import type { NextRequest } from 'next/server';

import { listHiringSkills } from '@/lib/hiring/skills/server';
import { zipFiles } from '@/lib/hiring/skills/zip';
import { fail, requireCompanyPermission } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * A skill as a ZIP for Claude's "Upload skill" (`?companyId=&name=`): one
 * folder named after the skill, with its SKILL.md inside.
 */
export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId');
  const name = request.nextUrl.searchParams.get('name');
  const { response, user } = await requireCompanyPermission(
    companyId,
    'hiring:read',
  );
  if (response || !user || !companyId)
    return response ?? fail(401, 'Authentication required.');
  const skill = (await listHiringSkills(companyId)).find(
    (s) => s.name === name,
  );
  if (!skill) return fail(404, 'Skill not found.');

  const zip = zipFiles([
    { path: `${skill.name}/SKILL.md`, content: skill.body },
  ]);
  return new Response(new Uint8Array(zip), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${skill.name}.zip"`,
      'Cache-Control': 'no-store',
    },
  });
}
