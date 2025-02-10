'use client';
import { useUser } from '@/utils/hooks/useUser';
import {
  getCurrentPushSubscription,
  registerPushNotification,
  unregisterPushNotification,
} from '@/utils/services/notifications/pushService';
import { CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';

const PushSubscriptionToggleButton = () => {
  const [hasActivePushSubscription, setHasActivePushSubscription] =
    useState<boolean>();
  const [loading, setLoading] = useState<boolean>(false);

  const { user } = useUser();

  useEffect(() => {
    const getActivePushSubscription = async () => {
      try {
        const subscription = await getCurrentPushSubscription();
        setHasActivePushSubscription(!!subscription);
      } catch (error) {
        console.error(error);
      }
    };
    getActivePushSubscription();
  }, []);

  const setPushNotificationsEnabled = async (enabled: boolean) => {
    if (!user?.id) return;
    if (loading) return;
    try {
      setLoading(true);

      if (enabled) {
        try {
          await registerPushNotification(user?.id);
        } catch (error) {
          const activeSubscription = await getCurrentPushSubscription();
          if (activeSubscription) {
            activeSubscription.unsubscribe();
          }
          throw error;
        }
      } else {
        await unregisterPushNotification(user?.id);
      }
      setHasActivePushSubscription(enabled);
      if (enabled) {
        toast.success('Push notifications enabled');
      } else {
        toast.warning('Push notifications disabled');
      }
    } catch (error) {
      console.error(error);
      if (enabled && Notification.permission === 'denied') {
        toast.error(
          'Please enable push notifications in your browser settings.',
        );
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (hasActivePushSubscription === undefined) return null;

  return (
    <div className="relative flex cursor-pointer items-start justify-center">
      {hasActivePushSubscription ? (
        <div
          onClick={() => setPushNotificationsEnabled(false)}
          title="Disable push notifications"
          className="flex w-full flex-row items-center justify-center gap-2 px-2 py-4"
        >
          <span className="material-symbols-outlined">
            notifications_active
          </span>
          <span className="w-fit">Push Notification</span>
        </div>
      ) : (
        <div
          onClick={() => setPushNotificationsEnabled(true)}
          title="Enable push notifications"
          className="flex w-full flex-row items-center justify-center gap-2 px-2 py-4"
        >
          <span className="material-symbols-outlined">notifications_off</span>
          <span className="w-fit">Push Notification</span>
        </div>
      )}
      {loading && (
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <CircularProgress
            size={12}
            sx={{ width: 'inherit', height: 'inherit' }}
            color="inherit"
          />
        </div>
      )}
      <Toaster position="bottom-left" richColors duration={3000} />
    </div>
  );
};

export default PushSubscriptionToggleButton;
