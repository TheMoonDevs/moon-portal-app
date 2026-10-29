import type { Metadata } from 'next';

import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { DayLogPage } from '@/components/screens/Worklogs/DayLog/DayLogPage';

export const metadata: Metadata = {
  title: 'My Worklogs - Portal',
};

/** The worklog page, on today or `?date=`. */
export default function Worklogs({
  searchParams,
}: {
  searchParams?: { date?: string };
}) {
  return (
    <PageAccess isAuthRequired={true}>
      <DayLogPage initialDate={searchParams?.date} />
      <Bottombar visible={true} />
    </PageAccess>
  );
}
