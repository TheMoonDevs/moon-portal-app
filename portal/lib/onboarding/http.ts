import { fail } from '@/lib/workspace/server';

import { OnboardingError } from './server';

/** Turns an onboarding error into a response; anything else is a 500. */
export function onboardingFailure(e: unknown) {
  if (e instanceof OnboardingError) return fail(e.status, e.message);
  console.error('[onboarding]', e);
  return fail(500, 'Something went wrong. Try again.');
}
