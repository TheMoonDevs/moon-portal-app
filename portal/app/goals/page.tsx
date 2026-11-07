import type { Metadata } from 'next';

import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { GoalsPage } from '@/components/screens/Goals/GoalsPage';

export const metadata: Metadata = { title: 'Goals - Portal' };

export default function Goals() {
  return (
    <PageAccess isAuthRequired={true}>
      <GoalsPage />
      <Bottombar visible={true} />
    </PageAccess>
  );
}
