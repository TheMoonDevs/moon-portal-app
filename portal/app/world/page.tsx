import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { WorldPage } from '@/components/screens/World/WorldPage';

const World = () => (
  <PageAccess isAuthRequired={true}>
    <WorldPage />
    <Bottombar visible={true} />
  </PageAccess>
);

export default World;
