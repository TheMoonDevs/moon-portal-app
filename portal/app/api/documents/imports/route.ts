import {
  deleteImport,
  presignImport,
  registerImport,
  updateImport,
} from '@/lib/agreements/imports';
import { agreementFailure } from '@/lib/agreements/server';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * Documents signed before the Portal. Uploading takes two calls, because
 * the PDF goes straight to storage:
 * `{ action: 'upload', companyId, name, size, mime }` gives a signed link to
 * PUT the file to, then `{ action: 'register', companyId, key, title,
 * typeKey, userId | personName + personEmail, signedOn, endsOn?,
 * confidential?, note? }` files it under the person.
 */
export async function POST(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  try {
    if (body.action === 'upload')
      return ok(
        await presignImport(actor, String(body.companyId ?? ''), {
          name: body.name,
          size: body.size,
          mime: body.mime,
        }),
      );
    if (body.action === 'register')
      return ok({ document: await registerImport(actor, body) });
    return fail(400, 'Unknown action.');
  } catch (e) {
    return agreementFailure(e);
  }
}

/** Changes an imported document's title, type, dates or confidentiality. */
export async function PUT(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  if (typeof body.id !== 'string' || !/^[a-f0-9]{24}$/i.test(body.id))
    return fail(400, 'id is required.');
  try {
    return ok({ document: await updateImport(actor, body.id, body) });
  } catch (e) {
    return agreementFailure(e);
  }
}

/** Removes an imported document and its file: `?id`. */
export async function DELETE(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!/^[a-f0-9]{24}$/i.test(id)) return fail(400, 'id is required.');
  try {
    await deleteImport(actor, id);
    return ok({ deleted: true });
  } catch (e) {
    return agreementFailure(e);
  }
}
