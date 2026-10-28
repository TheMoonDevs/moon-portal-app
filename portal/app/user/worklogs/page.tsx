import type { Metadata } from 'next';

import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { DayLogPage } from '@/components/screens/Worklogs/DayLog/DayLogPage';
import { WorklogsPage } from '@/components/screens/Worklogs/WorklogsPage';

export const metadata: Metadata = {
  title: 'My Worklogs - Portal',
};

/**
 * The worklog page, on today or `?date=`. `?classic=1` still opens the
 * older month view with the markdown editor.
 */
export default function Worklogs({
  searchParams,
}: {
  searchParams?: { date?: string; classic?: string };
}) {
  return (
    <PageAccess isAuthRequired={true}>
      {searchParams?.classic ? (
        <WorklogsPage />
      ) : (
        <DayLogPage initialDate={searchParams?.date} />
      )}
      <Bottombar visible={true} />
    </PageAccess>
  );
}
