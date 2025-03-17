import { PageAccess } from '@/components/global/PageAccess';
import { CustomBotsHomePage } from '@/components/screens/CustomBots/HomePage';

export default function DashboardPage() {
  return (
    <PageAccess isAuthRequired={true}>
      <CustomBotsHomePage />
    </PageAccess>
  );
}
