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

const fetchNotifications = async (url: string): Promise<Notification[]> => {
  const response = await PortalSdk.getData(url, null);
  return response.data.notifications;
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

  const {
    data: fetchedNotifications,
    error,
  }: SWRResponse<Notification[], Error> = useSWR(
    user ? `/api/notifications/get?userId=${user.id}` : null,
    fetchNotifications
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
