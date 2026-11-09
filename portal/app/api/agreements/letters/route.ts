import {
  approveLetter,
  companyLetters,
  declineLetter,
  draftLetter,
  startLetter,
} from '@/lib/agreements/letters';
import { agreementFailure } from '@/lib/agreements/server';
import { originOf } from '@/lib/mcp/tokens';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

const metaOf = (request: Request) => ({
  ip:
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip'),
  userAgent: request.headers.get('user-agent'),
});

/** `?companyId=` The company's letter requests, for HR and owners. */
export async function GET(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const companyId = new URL(request.url).searchParams.get('companyId') ?? '';
  try {
    return ok(await companyLetters(actor, companyId));
  } catch (e) {
    return agreementFailure(e);
  }
}

/**
 * `{ action: 'draft', id }` the letter filled from the person's record;
 * `{ action: 'start', companyId, userId, kind, purpose?, addressedTo? }`
 * writes one for someone who didn't ask in the Portal;
 * `{ action: 'approve', id, values, body?, sign? }` sends it for the
 * company's signature (and signs it, when that's you with a saved
 * signature); `{ action: 'decline', id, reason? }` declines the request.
 */
export async function POST(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? '');
  try {
    const origin = originOf(request);
    if (body.action === 'draft') return ok(await draftLetter(actor, id));
    if (body.action === 'start') return ok(await startLetter(actor, body));
    if (body.action === 'approve')
      return ok(await approveLetter(actor, id, body, metaOf(request), origin));
    if (body.action === 'decline')
      return ok({
        request: await declineLetter(actor, id, body.reason, origin),
      });
    return fail(400, 'Unknown action.');
  } catch (e) {
    return agreementFailure(e);
  }
}
