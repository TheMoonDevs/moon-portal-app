import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { DayLogPage } from '@/components/screens/Worklogs/DayLog/DayLogPage';

/** One day on its own page, as a phone opens a day. */
export default function WorklogViewPage({
  searchParams,
}: {
  params: {
    id: string;
  };
  searchParams?: { date?: string };
}) {
  return (
    <PageAccess isAuthRequired={true}>
      <DayLogPage initialDate={searchParams?.date} layout="day" />
      <Bottombar visible={true} />
    </PageAccess>
  );
}
