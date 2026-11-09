import {
  cancelLetter,
  myLetters,
  requestLetter,
} from '@/lib/agreements/letters';
import { agreementFailure } from '@/lib/agreements/server';
import { originOf } from '@/lib/mcp/tokens';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/** The signed-in person's letter requests, and the letters they can ask for. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail(401, 'Authentication required.');
  try {
    return ok(await myLetters(user));
  } catch (e) {
    return agreementFailure(e);
  }
}

/** `{ companyId, kind, purpose?, addressedTo?, neededBy?, note? }` asks for one. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  try {
    return ok({
      request: await requestLetter(user, body, originOf(request)),
    });
  } catch (e) {
    return agreementFailure(e);
  }
}

/** `{ id, action: 'cancel' }` withdraws a request HR hasn't acted on. */
export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  try {
    if (body.action !== 'cancel') return fail(400, 'Unknown action.');
    await cancelLetter(user, String(body.id ?? ''));
    return ok({ cancelled: true });
  } catch (e) {
    return agreementFailure(e);
  }
}
