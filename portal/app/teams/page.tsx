import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { TeamsPage } from '@/components/screens/Teams/TeamsPage';

export default function Home() {
  return (
    <PageAccess isAuthRequired={true}>
      <TeamsPage />
      <Bottombar visible={true} />
    </PageAccess>
  );
}
