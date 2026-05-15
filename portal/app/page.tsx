import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { HomePage } from '@/components/screens/Home/HomePage';

export default function Home() {
  return (
    <PageAccess isAuthRequired={true}>
      <HomePage />
      <Bottombar visible={true} />
    </PageAccess>
  );
}
