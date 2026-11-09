import type { Metadata } from 'next';

import { VerifyPage } from '@/components/screens/Verify/VerifyPage';

export const metadata: Metadata = {
  title: 'Verify a signed document',
  description:
    'Check that a PDF signed in the Portal is genuine and unchanged since it was signed.',
};

export default function Verify({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  return (
    <VerifyPage
      initialId={typeof searchParams.id === 'string' ? searchParams.id : ''}
    />
  );
}
