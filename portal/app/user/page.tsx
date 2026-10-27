import { Suspense } from 'react';

import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { UserPage } from '@/components/screens/UserPage/UserPage';

/** The signed-in person's own page. */
const MyPage = () => (
  <PageAccess isAuthRequired={true}>
    <Suspense>
      <UserPage />
    </Suspense>
    <Bottombar visible={true} />
  </PageAccess>
);

export default MyPage;
