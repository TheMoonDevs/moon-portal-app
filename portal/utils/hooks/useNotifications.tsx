'use client';
import { useEffect } from 'react';
import useSWR, { SWRResponse } from 'swr';
import { PortalSdk } from '../services/PortalSdk';
import {
  setNotifications,
  setNotificationsCount,
} from '../redux/notification/notification.slice';
import { useAppDispatch, useAppSelector } from '../redux/store';
import { Notification } from '@prisma/client';
import { JsonObject } from '@prisma/client/runtime/library';
import { APP_BASE_URL } from '../constants/appInfo';

const fetchNotifications = async (
  url: string,
  userId: string,
  hasWallet: boolean
): Promise<Notification[]> => {
  const response = await PortalSdk.getData(url, null);
  const notifications = response.data.notifications;

  if (!hasWallet) {
    const existingWalletNotification = notifications.find(
      (notification: Notification) =>
        notification.matchId === `${userId}_onboard_walletAddress`
    );

    if (!existingWalletNotification) {
      const walletNotification = {
        userId,
        title: 'Wallet Address Required',
        description: 'Please add your wallet address to continue.',
        matchId: `${userId}_onboard_walletAddress`,
        notificationType: 'SELF_GENERATED',
        notificationData: {
          actions: [
            {
              title: 'Add Wallet Address',
              trigger_type: 'url',
              trigger: `${APP_BASE_URL}/member/onboarding/wallet`,
            },
          ],
          actionDone: false,
        },
      };

      await PortalSdk.postData('/api/notifications/add', walletNotification);

      const updatedResponse = await PortalSdk.getData(url, null);
      return updatedResponse.data.notifications;
    }
  }

  return notifications;
};

export const useNotifications = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const notifications = useAppSelector(
    (state) => state.notifications.notifications
  );
  const notificationsCount = useAppSelector(
    (state) => state.notifications.notificationsCount
  );
  const payData = user?.payData as JsonObject;

  const {
    data: fetchedNotifications,
    error,
  }: SWRResponse<Notification[], Error> = useSWR(
    user ? `/api/notifications/get?userId=${user.id}` : null,
    (url) =>
      fetchNotifications(
        url,
        user?.id as string,
        Boolean(payData?.walletAddress)
      ),
    {
      refreshInterval: 3 * 60 * 1000,
    }
  );

  useEffect(() => {
    if (fetchedNotifications) {
      dispatch(setNotifications(fetchedNotifications));
      dispatch(setNotificationsCount(fetchedNotifications.length));
    }
  }, [fetchedNotifications, dispatch]);

  return {
    notifications,
    notificationsCount,
    isLoading: !error && !fetchedNotifications,
    isError: error,
  };
};
