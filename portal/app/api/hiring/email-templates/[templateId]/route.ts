import { parseTemplateInput } from '@/lib/hiring/emailServer';
import { db } from '@/lib/mongodb/db-client';
import {
  fail,
  nowIso,
  ok,
  requireCompanyPermission,
} from '@/lib/workspace/server';
import type { HiringEmailTemplate } from '@/models/hiring';

export const dynamic = 'force-dynamic';

type Params = { params: { templateId: string } };

async function requireTemplate(templateId: string) {
  const template: HiringEmailTemplate | null =
    await db.hiringEmailTemplate.findFirst({ where: { id: templateId } });
  const guard = await requireCompanyPermission(
    template?.companyId ?? null,
    'hiring:edit',
  );
  if (guard.response && guard.user && !template)
    return { response: fail(404, 'Template not found.'), template, user: null };
  return { response: guard.response, template, user: guard.user };
}

/** Changes a template: any of `{ name, subject, body, moveTo }`. */
export async function PATCH(request: Request, { params }: Params) {
  const { response, template, user } = await requireTemplate(params.templateId);
  if (response || !template || !user)
    return response ?? fail(401, 'Authentication required.');

  const body = await request.json().catch(() => ({}));
  const { data, error } = parseTemplateInput(body);
  if (error) return fail(400, error);

  const updated: HiringEmailTemplate = await db.hiringEmailTemplate.update({
    where: { id: template.id },
    data: { ...data, updatedById: user.id, updatedAt: nowIso() },
  });
  return ok({ template: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { response, template } = await requireTemplate(params.templateId);
  if (response || !template)
    return response ?? fail(401, 'Authentication required.');

  await db.hiringEmailTemplate.delete({ where: { id: template.id } });
  return ok({ id: template.id });
}
