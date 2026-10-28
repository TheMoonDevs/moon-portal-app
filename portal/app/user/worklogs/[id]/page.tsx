import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { DayLogPage } from '@/components/screens/Worklogs/DayLog/DayLogPage';
import { WorklogViewPageWrapper } from '@/components/screens/Worklogs/WorklogViewPageWrapper';
import media from '@/styles/media';

/**
 * Older links to one worklog. A day's log opens the worklog page on that
 * day; other kinds of log (and `classic=1`) keep the markdown editor.
 */
export default function WorklogViewPage({
  params,
  searchParams,
}: {
  params: {
    id: string;
  };
  searchParams?: { logType?: string; date?: string; classic?: string };
}) {
  const dayLog = !searchParams?.logType || searchParams.logType === 'dayLog';
  if (dayLog && !searchParams?.classic)
    return (
      <PageAccess isAuthRequired={true}>
        <DayLogPage initialDate={searchParams?.date} />
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
