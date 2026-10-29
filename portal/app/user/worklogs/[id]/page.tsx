import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { DayLogPage } from '@/components/screens/Worklogs/DayLog/DayLogPage';
import { WorklogViewPageWrapper } from '@/components/screens/Worklogs/WorklogViewPageWrapper';
import media from '@/styles/media';

/**
 * One worklog on its own page, as a phone opens a day. A day's log opens on
 * the day sheet; other kinds of log keep the markdown editor.
 */
export default function WorklogViewPage({
  params,
  searchParams,
}: {
  params: {
    id: string;
  };
  searchParams?: { logType?: string; date?: string };
}) {
  const dayLog = !searchParams?.logType || searchParams.logType === 'dayLog';
  if (dayLog)
    return (
      <PageAccess isAuthRequired={true}>
        <DayLogPage initialDate={searchParams?.date} layout="day" />
        <Bottombar visible={true} />
      </PageAccess>
    );
  return (
    <PageAccess isAuthRequired={true}>
      <WorklogViewPageWrapper id={params.id} />
      <Bottombar visibleOnlyOn={media.moreTablet} />
    </PageAccess>
  );
}
