'use client';

import { useEffect } from 'react';

import { registerServiceWorker } from '@/utils/helpers/serviceWorker';
import { useUser } from '@/utils/hooks/useUser';

const PushServiceRegistration = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useUser();
  useEffect(() => {
    if (!user) return;
    const setUpNotificationServiceWorker = async () => {
      try {
        await registerServiceWorker();
      } catch (error) {
        console.error(error);
      }
    };
    setUpNotificationServiceWorker();
  }, [user]);
  return <>{children}</>;
};

export default PushServiceRegistration;
