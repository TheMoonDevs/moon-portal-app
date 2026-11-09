import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { cache } from 'react';

import { SignLinkMissing, SignPage } from '@/components/screens/Sign/SignPage';
import { proofCookieName } from '@/lib/agreements/emailCode';
import { agreementByToken, signingState } from '@/lib/agreements/server';
import { getSessionUser } from '@/lib/permissions/server';

export const dynamic = 'force-dynamic';

type Props = { params: { token: string } };

/** What a signer's /sign link may show, or null for a wrong link. */
const loadSign = cache(async (token: string) => {
  const found = await agreementByToken(token);
  if (!found) return null;
  // Signed in as this signer, they can approve with a saved signature.
  const viewer = await getSessionUser().catch(() => null);
  // With an email code entered, the browser holds the proof.
  const proof = cookies().get(proofCookieName(found.signer.id))?.value ?? null;
  return signingState(found.agreement, token, viewer, proof);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const state = await loadSign(params.token);
  return {
    title: state ? `Sign: ${state.title}` : 'Link not found',
    robots: { index: false, follow: false },
  };
}

export default async function Sign({ params }: Props) {
  const state = await loadSign(params.token);
  if (!state) return <SignLinkMissing />;
  return <SignPage initial={state} />;
}
