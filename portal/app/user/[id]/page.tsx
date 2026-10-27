import { Suspense } from 'react';

import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { UserPage } from '@/components/screens/UserPage/UserPage';

const PersonPage = ({ params }: { params: { id: string } }) => (
  <PageAccess isAuthRequired={true}>
    <Suspense>
      <UserPage userId={params.id} />
    </Suspense>
    <Bottombar visible={true} />
  </PageAccess>
);

export default PersonPage;
