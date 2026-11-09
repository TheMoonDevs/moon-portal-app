import { approveMine, myDocuments } from '@/lib/agreements/mine';
import { agreementFailure } from '@/lib/agreements/server';
import { originOf } from '@/lib/mcp/tokens';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * Approves documents with the saved signature: `{ ref }` or `{ refs: [] }`
 * (an agreement id, or `onboarding:<hire>:<document>`). Returns the
 * person's documents afterwards, and any that could not be approved.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  const refs: string[] = (
    Array.isArray(body?.refs) ? body.refs : body?.ref ? [body.ref] : []
  )
    .filter((r: unknown): r is string => typeof r === 'string')
    .slice(0, 50);
  if (!refs.length) return fail(400, 'Say which document to approve.');
  const meta = {
    ip:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip'),
    userAgent: request.headers.get('user-agent'),
  };
  const origin = originOf(request);
  const failed: Array<{ ref: string; error: string }> = [];
  for (const ref of refs) {
    try {
      await approveMine(user, ref, meta, origin);
    } catch (e) {
      if (refs.length === 1) return agreementFailure(e);
      failed.push({
        ref,
        error: e instanceof Error ? e.message : 'Could not approve it.',
      });
    }
  }
  return ok({ ...(await myDocuments(user)), failed });
}
