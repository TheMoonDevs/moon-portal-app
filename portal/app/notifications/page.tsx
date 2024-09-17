import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import NotificationsScreen from '@/components/screens/notifications/NotificationsScreen';

export default function NotificationsPage() {

  return (
    <PageAccess isAuthRequired={true}>
      <NotificationsScreen />
      <Bottombar visible={true} />
    </PageAccess>
  );
}
