import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PageAccess } from '@/components/global/PageAccess';
import { RestDayPage } from '@/components/screens/RestDay/RestDayPage';

export const metadata: Metadata = { title: 'Rest day - Portal' };

// Opened from the 10pm "no work logged" notification.
export default function RestDay() {
  return (
    <PageAccess isAuthRequired={true}>
      <Suspense>
        <RestDayPage />
      </Suspense>
    </PageAccess>
  );
}
