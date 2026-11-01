import { originOf } from '@/lib/mcp/tokens';
import { onboardingFailure } from '@/lib/onboarding/http';
import {
  decideTrial,
  endOnboarding,
  onboardingForActor,
  resendStepEmail,
  sendAgreements,
} from '@/lib/onboarding/server';
import { hireView } from '@/lib/onboarding/view';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

type Params = { params: { onboardingId: string } };

export async function GET(request: Request, { params }: Params) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  try {
    const onboarding = await onboardingForActor(
      actor,
      params.onboardingId,
      'hiring:read',
    );
    return ok({ hire: await hireView(onboarding, actor, originOf(request)) });
  } catch (e) {
    return onboardingFailure(e);
  }
}

/**
 * One step for a hire, by `action`:
 * - `terms`: `{ terms, send? }` saves the agreement terms and sends the
 *   Trial Policy and NDA (or keeps them until the details form is back)
 * - `decide`: `{ outcome: ACCEPTED | REJECTED, offer?, note?, notify? }`
 * - `resend`: emails the current step again
 * - `end`: `{ note?, notify? }` stops onboarding
 */
export async function PATCH(request: Request, { params }: Params) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  try {
    const onboarding = await onboardingForActor(
      actor,
      params.onboardingId,
      'hiring:edit',
    );
    const origin = originOf(request);
    let result;
    switch (body.action) {
      case 'terms':
        result = await sendAgreements(
          actor,
          onboarding,
          body.terms ?? {},
          origin,
          {
            send: body.send !== false,
          },
        );
        break;
      case 'decide':
        if (body.outcome !== 'ACCEPTED' && body.outcome !== 'REJECTED')
          return fail(400, 'outcome is ACCEPTED or REJECTED.');
        result = await decideTrial(
          actor,
          onboarding,
          {
            outcome: body.outcome,
            offer: body.offer ?? null,
            note: body.note ?? null,
            notify: body.notify !== false,
          },
          origin,
        );
        break;
      case 'resend':
        result = await resendStepEmail(actor, onboarding, origin);
        break;
      case 'end':
        result = await endOnboarding(
          actor,
          onboarding,
          { note: body.note ?? null, notify: body.notify !== false },
          origin,
        );
        break;
      default:
        return fail(400, 'Unknown action.');
    }
    return ok({
      hire: await hireView(result.onboarding, actor, origin),
      emailError: result.emailError ?? null,
    });
  } catch (e) {
    return onboardingFailure(e);
  }
}
