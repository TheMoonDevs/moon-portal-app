import {
  agreementFailure,
  deleteTemplate,
  listTemplates,
  requireAgreements,
  saveTemplate,
  templateVersions,
} from '@/lib/agreements/server';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * A company's agreement templates, then the starter drafts. With
 * `&versions=<template id>`, that template's saved versions instead.
 */
export async function GET(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const params = new URL(request.url).searchParams;
  const companyId = params.get('companyId');
  if (!companyId) return fail(400, 'companyId is required.');
  try {
    const versionsOf = params.get('versions');
    if (versionsOf && /^[a-f0-9]{24}$/i.test(versionsOf))
      return ok({
        versions: await templateVersions(actor, companyId, versionsOf),
      });
    await requireAgreements(actor, companyId, 'agreements:read');
    return ok({ templates: await listTemplates(companyId) });
  } catch (e) {
    return agreementFailure(e);
  }
}

/**
 * Saves a template: `{ companyId, id?, name, category, title, body,
 * signerRoles?, fields? }`. A change of wording makes a new version.
 */
export async function PUT(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  if (typeof body.companyId !== 'string')
    return fail(400, 'companyId is required.');
  const id =
    typeof body.id === 'string' && /^[a-f0-9]{24}$/i.test(body.id)
      ? body.id
      : null;
  try {
    return ok({
      template: await saveTemplate(actor, body.companyId, id, body),
    });
  } catch (e) {
    return agreementFailure(e);
  }
}

/** Deletes one of the company's templates: `?companyId&id`. */
export async function DELETE(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const params = new URL(request.url).searchParams;
  const companyId = params.get('companyId');
  const id = params.get('id');
  if (!companyId || !id || !/^[a-f0-9]{24}$/i.test(id))
    return fail(400, 'companyId and id are required.');
  try {
    await deleteTemplate(actor, companyId, id);
    return ok({ deleted: true });
  } catch (e) {
    return agreementFailure(e);
  }
}
