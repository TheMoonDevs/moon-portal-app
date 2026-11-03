import type { Metadata } from 'next';
import { Suspense } from 'react';

import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { MessagesPage } from '@/components/screens/Messages/MessagesPage';
import media from '@/styles/media';

export const metadata: Metadata = { title: 'Messages - Portal' };

/** An open chat. On phones it takes the whole screen (no tab bar). */
export default function Chat({
  params,
}: {
  params: { conversationId: string };
}) {
  return (
    <PageAccess isAuthRequired={true}>
      <Suspense>
        <MessagesPage conversationId={params.conversationId} />
      </Suspense>
      <Bottombar visibleOnlyOn={media.moreTablet} />
    </PageAccess>
  );
}
