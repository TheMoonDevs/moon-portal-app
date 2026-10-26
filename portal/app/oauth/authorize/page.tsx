import { Suspense } from 'react';

import { ConnectApproval } from '@/components/screens/Connect/ConnectApproval';

export const dynamic = 'force-dynamic';

const AuthorizePage = () => (
  <Suspense>
    <ConnectApproval />
  </Suspense>
);

export default AuthorizePage;
