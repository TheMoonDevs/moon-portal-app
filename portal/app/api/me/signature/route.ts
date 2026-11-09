import { agreementFailure } from '@/lib/agreements/server';
import {
  deleteSavedSignature,
  getSavedSignature,
  savedSignatureView,
  saveSignature,
} from '@/lib/agreements/signers';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/** The signed-in person's saved signature, or null. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail(401, 'Authentication required.');
  return ok({
    signature: savedSignatureView(await getSavedSignature(user.id)),
  });
}

/** Saves it: `{ name, image? }` (a PNG data URL when drawn). */
export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  try {
    return ok({ signature: await saveSignature(user.id, body ?? {}) });
  } catch (e) {
    return agreementFailure(e);
  }
}

/** Forgets it; documents already signed keep their signature. */
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return fail(401, 'Authentication required.');
  await deleteSavedSignature(user.id);
  return ok({ signature: null });
}
