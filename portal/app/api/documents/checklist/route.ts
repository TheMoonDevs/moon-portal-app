import { sendMissing } from '@/lib/agreements/rollouts';
import { agreementFailure } from '@/lib/agreements/server';
import { requiredChecklist } from '@/lib/agreements/vault';
import { originOf } from '@/lib/mcp/tokens';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Everyone in a company against what their roles must have signed. */
export async function GET(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const companyId = new URL(request.url).searchParams.get('companyId');
  if (!companyId) return fail(400, 'companyId is required.');
  try {
    return ok({
      checklist: await requiredChecklist(actor, companyId, originOf(request)),
    });
  } catch (e) {
    return agreementFailure(e);
  }
}

/**
 * Sends a required document to everyone missing it: `{ companyId,
 * requirementId, userIds?, values?, message?, expiresOn? }`. A batch at a
 * time; `remaining` says how many are still to go.
 */
export async function POST(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  if (
    typeof body.companyId !== 'string' ||
    typeof body.requirementId !== 'string'
  )
    return fail(400, 'companyId and requirementId are required.');
  try {
    return ok(
      await sendMissing(
        actor,
        body.companyId,
        body.requirementId,
        body,
        originOf(request),
      ),
    );
  } catch (e) {
    return agreementFailure(e);
  }
}
