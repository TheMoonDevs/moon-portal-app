import type { Metadata } from 'next';
import { Suspense } from 'react';

import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { MeetPage } from '@/components/screens/Meet/MeetPage';

export const metadata: Metadata = { title: 'Meet with me - Portal' };

export default function Meet() {
  return (
    <PageAccess isAuthRequired={true}>
      <Suspense>
        <MeetPage />
      </Suspense>
      <Bottombar visible={true} />
    </PageAccess>
  );
}
