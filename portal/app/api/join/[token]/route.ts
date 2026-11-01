import { clientKeyFor, isRateLimited } from '@/lib/hiring/server';
import { originOf } from '@/lib/mcp/tokens';
import { onboardingFailure } from '@/lib/onboarding/http';
import { joinState, onboardingByToken } from '@/lib/onboarding/join';
import {
  checkPhoto,
  markViewed,
  parseDetails,
  signDocument,
  submitDetails,
} from '@/lib/onboarding/server';
import { fail, ok } from '@/lib/workspace/server';
import { ONBOARDING_STEP } from '@/models/onboarding';

export const dynamic = 'force-dynamic';

type Params = { params: { token: string } };

const NOT_FOUND = 'This link does not exist.';

export async function GET(request: Request, { params }: Params) {
  const onboarding = await onboardingByToken(params.token);
  if (!onboarding) return fail(404, NOT_FOUND);
  return ok({ state: await joinState(onboarding, originOf(request)) });
}

/**
 * The details form, as multipart form data: `payload` holds the answers as
 * JSON and `photo` the profile photo. The link is the only key.
 */
export async function POST(request: Request, { params }: Params) {
  if (isRateLimited(clientKeyFor(request)))
    return fail(429, 'Too many tries from here. Try again later.');
  const onboarding = await onboardingByToken(params.token);
  if (!onboarding) return fail(404, NOT_FOUND);
  if (onboarding.step !== ONBOARDING_STEP.DETAILS)
    return fail(409, 'We already have your details. Thank you!');

  const form = await request.formData().catch(() => null);
  if (!form) return fail(400, 'Your details could not be read.');
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(String(form.get('payload') ?? '{}'));
  } catch {
    return fail(400, 'Your details could not be read.');
  }
  const rawPhoto = form.get('photo');
  const photo =
    rawPhoto && typeof rawPhoto !== 'string' && rawPhoto.size ? rawPhoto : null;
  const { details, errors } = parseDetails(payload, onboarding.email);
  const photoError = photo ? checkPhoto(photo) : 'Add a profile photo.';
  if (photoError) errors.photo = photoError;
  if (!details || Object.keys(errors).length)
    return Response.json(
      { status: 'fail', error: 'Please fix the highlighted answers.', errors },
      { status: 400 },
    );
  try {
    const origin = originOf(request);
    const { onboarding: updated } = await submitDetails(
      onboarding,
      details,
      photo,
      origin,
    );
    return ok({ state: await joinState(updated, origin) });
  } catch (e) {
    return onboardingFailure(e);
  }
}

/**
 * `{ action: 'view', docId }` notes that a document was opened;
 * `{ action: 'sign', docId, name, agree }` signs it.
 */
export async function PUT(request: Request, { params }: Params) {
  if (isRateLimited(clientKeyFor(request)))
    return fail(429, 'Too many tries from here. Try again later.');
  const onboarding = await onboardingByToken(params.token);
  if (!onboarding) return fail(404, NOT_FOUND);
  const body = await request.json().catch(() => ({}));
  const docId = typeof body.docId === 'string' ? body.docId : '';
  try {
    const origin = originOf(request);
    if (body.action === 'view') {
      await markViewed(onboarding, docId);
      return ok({ viewed: true });
    }
    if (body.action !== 'sign') return fail(400, 'Unknown action.');
    const forwarded = request.headers.get('x-forwarded-for');
    const { onboarding: updated } = await signDocument(
      onboarding,
      docId,
      { name: body.name, agree: body.agree },
      {
        ip:
          forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
      origin,
    );
    return ok({ state: await joinState(updated, origin) });
  } catch (e) {
    return onboardingFailure(e);
  }
}
