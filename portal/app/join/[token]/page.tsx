import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { cache } from 'react';

import { JoinLinkMissing, JoinPage } from '@/components/screens/Join/JoinPage';
import { joinState, onboardingByToken } from '@/lib/onboarding/join';

export const dynamic = 'force-dynamic';

type Props = { params: { token: string } };

const originFromHeaders = () => {
  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto =
    h.get('x-forwarded-proto')?.split(',')[0] ??
    (host?.startsWith('localhost') ? 'http' : 'https');
  return host ? `${proto}://${host}` : (process.env.NEXTAUTH_URL ?? '');
};

/** What a new hire's /join link may show, or null for a wrong link. */
const loadJoin = cache(async (token: string) => {
  const onboarding = await onboardingByToken(token);
  if (!onboarding) return null;
  return joinState(onboarding, originFromHeaders());
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const state = await loadJoin(params.token);
  return {
    title: state ? `Joining ${state.companyName}` : 'Link not found',
    robots: { index: false, follow: false },
  };
}

export default async function Join({ params }: Props) {
  const state = await loadJoin(params.token);
  if (!state) return <JoinLinkMissing />;
  return <JoinPage initial={state} />;
}
