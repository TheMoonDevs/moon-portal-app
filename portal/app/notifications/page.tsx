import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { useNotifications } from '@/utils/hooks/useNotifications';
import NotificationsScreen from '@/components/screens/notifications/NotificationsScreen';
import { Notification } from '@prisma/client';

export default function NotificationsPage() {

  return (
    <PageAccess isAuthRequired={true}>
      <NotificationsScreen />
      <Bottombar visible={true} />
    </PageAccess>
  );
}
