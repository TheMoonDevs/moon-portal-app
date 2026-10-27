import type { Metadata } from 'next';

import { PoliciesPage } from '@/components/screens/Policies/PoliciesPage';

export const metadata: Metadata = {
  title: 'How we work · The Moon Devs',
  description:
    'The dreams, the manifesto and the codes everyone at The Moon Devs follows.',
};

export default function Policies() {
  return <PoliciesPage />;
}
