import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import Dashboard from '@/components/screens/CustomBots/Dashboard';
import { CustomBotsHomePage } from '@/components/screens/CustomBots/HomePage';

export default function DashboardPage() {
  return (
    <PageAccess isAuthRequired={true}>
      <CustomBotsHomePage />
    </PageAccess>
  );
}
