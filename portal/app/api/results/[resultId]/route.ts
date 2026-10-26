import { db } from '@/lib/mongodb/db-client';
import { fail, ok, requireProjectPermission } from '@/lib/workspace/server';
import type { ProjectResult } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { resultId: string } };

export async function DELETE(_request: Request, { params }: Params) {
  const result: ProjectResult | null = await db.projectResult.findFirst({
    where: { id: params.resultId },
  });
  if (!result) return fail(404, 'Reading not found.');
  const { response } = await requireProjectPermission(
    result.projectId,
    'projects:edit',
  );
  if (response) return response;
  await db.projectResult.delete({ where: { id: result.id } });
  return ok({ result });
}
