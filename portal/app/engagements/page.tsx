import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import EngagementsPage from '@/components/screens/Engagements/EngagementsPage';

export default function Home() {
  return (
    <PageAccess isAuthRequired={true}>
      <EngagementsPage />
      <Bottombar visible={true} />
    </PageAccess>
  );
}
