import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { WorklogSummaryByUserId } from '@/components/screens/Worklogs/WorklogSummary/WorklogSummaryByUserId';
import media from '@/styles/media';

export default function WorklogViewPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  return (
    <PageAccess isAuthRequired={true}>
      <WorklogSummaryByUserId userId={params.id} />
      <Bottombar visibleOnlyOn={media.moreTablet} />
    </PageAccess>
  );
}
