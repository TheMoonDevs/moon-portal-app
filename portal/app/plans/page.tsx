import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { PlansPage } from '@/components/screens/Plans/PlansPage';

const Plans = () => (
  <PageAccess isAuthRequired={true}>
    <PlansPage />
    <Bottombar visible={true} />
  </PageAccess>
);

export default Plans;
