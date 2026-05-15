import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { MissionsPage } from '@/components/screens/Missions/MissionsPage';

export default function Home() {
  return (
    <PageAccess isAuthRequired={true}>
      <MissionsPage />
      <Bottombar visible={true} />
    </PageAccess>
  );
}
