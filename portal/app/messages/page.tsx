import type { Metadata } from 'next';
import { Suspense } from 'react';

import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { MessagesPage } from '@/components/screens/Messages/MessagesPage';

export const metadata: Metadata = { title: 'Messages - Portal' };

export default function Messages() {
  return (
    <PageAccess isAuthRequired={true}>
      <Suspense>
        <MessagesPage conversationId={null} />
      </Suspense>
      <Bottombar visible={true} />
    </PageAccess>
  );
}
