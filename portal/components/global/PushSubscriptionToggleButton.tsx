'use client';
import { CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';

import { useUser } from '@/utils/hooks/useUser';
import {
  getCurrentPushSubscription,
  isPushSupported,
  needsHomeScreenInstall,
  PushPermissionError,
  registerPushNotification,
  sendTestPushNotification,
  unregisterPushNotification,
} from '@/utils/services/notifications/pushService';

import IOSSwitch from '../elements/SwitchComponent';

const PushSubscriptionToggleButton = ({ type }: { type?: 'switch' }) => {
  const [hasActivePushSubscription, setHasActivePushSubscription] =
    useState<boolean>();
  const [loading, setLoading] = useState<boolean>(false);
  const [installHint, setInstallHint] = useState(false);

  const { user } = useUser();

  useEffect(() => {
    const getActivePushSubscription = async () => {
      if (needsHomeScreenInstall()) {
        setInstallHint(true);
        return;
      }
      if (!isPushSupported()) return;
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
        await registerPushNotification();
      } else {
        await unregisterPushNotification();
      }
      setHasActivePushSubscription(enabled);
      if (enabled) {
        toast.success('Push notifications enabled');
      } else {
        toast.warning('Push notifications disabled');
      }
    } catch (error) {
      console.error(error);
      if (error instanceof PushPermissionError) {
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

  const sendTest = async () => {
    try {
      const { sent } = await sendTestPushNotification();
      if (!sent)
        toast.error('No device received it. Try turning push off and on.');
    } catch (error) {
      console.error(error);
      toast.error('Could not send a test notification.');
    }
  };

  if (installHint) {
    return (
      <p className="max-w-48 text-right text-xs text-neutral-500">
        Add Portal to your home screen (Share, then Add to Home Screen) to get
        notifications.
      </p>
    );
  }

  if (hasActivePushSubscription === undefined) return null;

  if (type === 'switch') {
    return (
      <div className="relative flex flex-col items-end gap-1">
        <IOSSwitch
          onChange={(e) => setPushNotificationsEnabled(e.target.checked)}
          disabled={loading}
          checked={hasActivePushSubscription}
          className={`${hasActivePushSubscription ? 'bg-green-500' : 'bg-gray-600'} ${loading ? 'opacity-50' : ''} relative inline-flex h-6 w-11 items-center rounded-full`}
        ></IOSSwitch>
        {hasActivePushSubscription && (
          <button
            type="button"
            onClick={sendTest}
            className="text-xs text-neutral-500 underline-offset-2 hover:underline"
          >
            Send a test
          </button>
        )}

        <Toaster position="bottom-left" richColors duration={3000} />
      </div>
    );
  }
  return (
    <>
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
    </>
  );
};

export default PushSubscriptionToggleButton;
