import {
  closeRollout,
  createRollout,
  listRollouts,
  loadRollout,
  previewRollout,
  remindRollout,
  rolloutView,
  syncRollout,
} from '@/lib/agreements/rollouts';
import { agreementFailure } from '@/lib/agreements/server';
import { originOf } from '@/lib/mcp/tokens';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** A company's policy rollouts (`?companyId`), or one with everyone in it (`?id`). */
export async function GET(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const params = new URL(request.url).searchParams;
  try {
    const id = params.get('id');
    if (id) {
      const r = await loadRollout(actor, id, 'agreements:read');
      return ok({ rollout: await rolloutView(r, true) });
    }
    const companyId = params.get('companyId');
    if (!companyId) return fail(400, 'companyId is required.');
    return ok({ rollouts: await listRollouts(actor, companyId) });
  } catch (e) {
    return agreementFailure(e);
  }
}

/**
 * Starts a rollout: `{ companyId, title, body, values?, templateId?,
 * audience: { kind: 'everyone' | 'project' | 'role', projectId?, roleKey? },
 * includeNewPeople?, blocking?, daysToSign?, message? }`. The first people
 * get it straight away; `remaining` says how many are still to go. With
 * `preview: true`, returns the text and who would get it, and sends nothing.
 */
export async function POST(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  try {
    if (body?.preview === true)
      return ok({ preview: await previewRollout(actor, body) });
    return ok(await createRollout(actor, body, originOf(request)));
  } catch (e) {
    return agreementFailure(e);
  }
}

/**
 * `{ id, action: 'sync' }` sends it to people who don't have it yet;
 * `{ id, action: 'remind' }` reminds everyone who hasn't acknowledged it;
 * `{ id, action: 'close' }` stops it going to anyone new.
 */
export async function PUT(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  try {
    const origin = originOf(request);
    const r = await loadRollout(
      actor,
      String(body.id ?? ''),
      'agreements:edit',
    );
    if (body.action === 'sync') {
      const res = await syncRollout(actor, r, origin);
      return ok({ ...res, rollout: await rolloutView(r, true) });
    }
    if (body.action === 'remind') {
      const res = await remindRollout(actor, r, origin);
      return ok({ ...res, rollout: await rolloutView(r, true) });
    }
    if (body.action === 'close') {
      await closeRollout(actor, r);
      return ok({
        rollout: await rolloutView({ ...r, status: 'CLOSED' }, true),
      });
    }
    return fail(400, 'Unknown action.');
  } catch (e) {
    return agreementFailure(e);
  }
}
