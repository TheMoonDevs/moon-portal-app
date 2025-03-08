import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import Dashboard from '@/components/screens/CustomBots/Dashboard';

export default function DashboardPage() {
  return (
    <PageAccess isAuthRequired={true}>
      <Dashboard />
    </PageAccess>
  );
}
