import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { AdminPage } from '@/components/screens/Admin/AdminPage';

export default function Home() {
  return (
    <PageAccess
      isAuthRequired={true}
      isAdminRequired={true}
      hasBottombar={false}
    >
      <AdminPage />
      <Bottombar visible={false} />
    </PageAccess>
  );
}
