"use client";
import { useEffect } from "react";
import useSWR, { SWRResponse } from "swr";
import { setNotifications } from "@/utils/redux/notification/notification.slice";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { INotification } from "@/components/screens/notifications/NotificationsList";

const NOTIFICATIONS_KEY = "notifications";
const ONE_MINUTE = 60 * 1000;

// Fetch notifications and lastModified from localStorage
const getNotificationsFromLocalStorage = () => {
  const storedData = localStorage.getItem(NOTIFICATIONS_KEY);
  if (!storedData)
    return {
      notifications: [],
      lastModified: new Date("1970-01-01").toUTCString(),
    };

  const parsedData = JSON.parse(storedData);

  return {
    notifications: parsedData?.notifications || [],
    lastModified:
      parsedData?.lastModified || new Date("1970-01-01").toUTCString(),
  };
};

// Save notifications and lastModified to localStorage
const saveNotificationsToLocalStorage = (
  notifications: INotification[],
  lastModified: string | null
) => {
  const dataToStore = { notifications, lastModified };
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(dataToStore));
};

// Check if lastModified is within the past 1 minute
const isLastModifiedTooRecent = (lastModified: string | null): boolean => {
  if (!lastModified) return false;
  const lastModifiedDate = new Date(lastModified).getTime();
  const currentTime = new Date().getTime();
  return currentTime - lastModifiedDate < ONE_MINUTE; // true if less than 1 minute ago
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

  const { data, error }: SWRResponse<any, Error> = useSWR(
    user ? `/api/notifications/get?userId=${user.id}` : null,
    async (url) => {
      const { lastModified } = getNotificationsFromLocalStorage();
      // Skip the fetch if the last modified is less than a minute ago
      if (isLastModifiedTooRecent(lastModified)) {
        console.log("Skipping fetch, data is fresh");
        return { newNotifications: [], lastModified };
      }

      // Set the If-Modified-Since header to get only new or updated notifications
      const headers: Record<string, string> = {};
      if (lastModified) {
        headers["If-Modified-Since"] = lastModified;
      }

      // Fetch only modified notifications from the server
      const response = await fetch(url, { headers });

      const newLastModified = response.headers.get("Last-Modified");

      if (response.status === 304) {
        return { newNotifications: [], lastModified: newLastModified }; // No updates, return an empty array
      }

      const data = await response.json();
      return {
        newNotifications: data.data.notifications,
        lastModified: newLastModified,
      };
    },
    {
      refreshInterval: 3 * 60 * 1000, // Refetch every 3 minutes
    }
  );

  useEffect(() => {
    const { newNotifications, lastModified: newLastModified } = data || {};
    const { notifications: storedNotifications } =
      getNotificationsFromLocalStorage();

    if (newNotifications && newNotifications.length > 0) {
      // Update existing notifications or add new ones
      const updatedNotifications = storedNotifications.map(
        (notification: any) => {
          const updated = newNotifications.find(
            (n: any) => n.id === notification.id
          );
          return updated ? updated : notification;
        }
      );
      // Append any new notifications that do not already exist
      newNotifications.forEach((notification: any) => {
        if (!updatedNotifications.find((n: any) => n.id === notification.id)) {
          updatedNotifications.push(notification);
        }
      });

      dispatch(setNotifications(updatedNotifications));

      // Save the new notifications and the new Last-Modified timestamp
      saveNotificationsToLocalStorage(updatedNotifications, newLastModified);
    }
  }, [data?.newNotifications]);

  useEffect(() => {
    const { notifications: storedNotifications } =
      getNotificationsFromLocalStorage();
    dispatch(setNotifications(storedNotifications));
  }, []);

  return {
    notifications,
    notificationsCount,
    isLoading: !error && !data?.notifications,
    isError: error,
  };
};
