'use client';

import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import media from '@/styles/media';
import { useUser } from '@/utils/hooks/useUser';

import { WorklogSummaryByUserId } from './WorklogSummaryByUserId';

export const DefaultWorklogSummary = () => {
  const { user } = useUser();
  return (
    <PageAccess isAuthRequired={true}>
      <WorklogSummaryByUserId userData={user} />
      <Bottombar visibleOnlyOn={media.moreTablet} />
    </PageAccess>
  );
};
