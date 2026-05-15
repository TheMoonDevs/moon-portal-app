import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { WorklogViewPageWrapper } from '@/components/screens/Worklogs/WorklogViewPageWrapper';
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
      <WorklogViewPageWrapper id={params.id} />
      <Bottombar visibleOnlyOn={media.moreTablet} />
    </PageAccess>
  );
}
