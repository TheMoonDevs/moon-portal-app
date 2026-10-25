import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { AdminPage } from '@/components/screens/Admin/AdminPage';

export default function Home() {
  return (
    // Admins and company managers both use this page; it shows each only the
    // tabs they can use and sends everyone else home.
    <PageAccess isAuthRequired={true} hasBottombar={false}>
      <AdminPage />
      <Bottombar visible={false} />
    </PageAccess>
  );
}
