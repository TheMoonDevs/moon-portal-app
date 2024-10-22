"use client";

import { useEffect } from "react";
import { useUser } from "@/utils/hooks/useUser";
import { registerServiceWorker } from "@/utils/helpers/serviceWorker";

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
