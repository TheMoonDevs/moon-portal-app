import type { Metadata } from 'next';

import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { WorklogsPage } from '@/components/screens/Worklogs/WorklogsPage';

export const metadata: Metadata = {
  title: 'My Worklogs - Portal',
  // TODO - change favicon to check icon on green circle
  // icon: "/favicon.ico",
};

export default function Worklogs() {
  return (
    <PageAccess isAuthRequired={true}>
      <WorklogsPage />
      <Bottombar visible={true} />
    </PageAccess>
  );
}
