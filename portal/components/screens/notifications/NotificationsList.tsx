"use client";
import { Notification } from "@prisma/client";
import React, { useState } from "react";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import Link from "next/link";
import { useAppSelector } from "@/utils/redux/store";
import { PortalSdk } from "@/utils/services/PortalSdk";
import ToolTip from "@/components/elements/ToolTip";
import { useUser } from "@/utils/hooks/useUser";

export interface INotification extends Omit<Notification, "notificationData"> {
  notificationData: INotificationData;
}

export interface INotificationData {
  actions: IAction[];
  actionDone: boolean;
}

export interface IAction {
  title: string;
  trigger_type: string;
  trigger: string;
}

export const timeAgo = (timestamp: string) => {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
};

const NotificationsList = () => {
  const notifications = useAppSelector(
    (state) => state.notifications.notifications
  );
  // console.log(notifications);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const hasUnreadNotifications = notifications.some(
    (notification: INotification) => !notification?.isRead
  );
  const { user } = useUser();

  const handleRead = async (notification: INotification) => {
    try {
      await PortalSdk.putData("/api/notifications/update", {
        ...notification,
        isRead: !notification.isRead,
      });
    } catch (error) {
      console.error("Error marking notification as read", error);
    }
  };

  const toggleDescription = (notification: INotification) => {
    if (expandedId === notification.id) {
      setExpandedId(null);
    } else {
      setExpandedId(notification.id);

      if (!notification.isRead) {
        handleRead(notification);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(
      (notification: INotification) => !notification?.isRead
    );
    if (unreadNotifications.length === 0) return;

    try {
      await Promise.all(
        unreadNotifications.map((notification: INotification) =>
          PortalSdk.putData("/api/notifications/update", {
            ...notification,
            isRead: true,
          })
        )
      );
    } catch (error) {
      console.error("Error marking all notifications as read", error);
    }
  };

  return (
    <div className="">
      <div className="sticky top-0 bg-white z-10 p-4">
        <div className="flex justify-between items-center">
          <h4 className="text-lg font-bold">Notifications</h4>
          <button
            className={`text-xs text-gray-600 flex gap-1 items-center p-2 ${
              !hasUnreadNotifications ? "cursor-not-allowed opacity-50" : ""
            }`}
            onClick={handleMarkAllAsRead}
            disabled={!hasUnreadNotifications}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "16px" }}
            >
              done_all
            </span>
            Mark all as read
          </button>
        </div>
      </div>
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-gray-50 p-6 rounded-lg border border-gray-200">
          <span className="material-symbols-outlined text-gray-600 text-4xl mb-2">
            notifications
          </span>
          <span className="text-gray-500 text-lg">No notifications</span>
        </div>
      ) : (
        <div className="space-y-2 p-4">
          {notifications.map((notification: INotification) => (
            <div
              key={notification.id}
              className={`flex flex-col p-3 ${
                (!notification.isRead ||
                  !notification?.notificationData?.actionDone) &&
                "bg-gray-100"
              } rounded-lg shadow hover:bg-gray-200 transition cursor-pointer`}
              onClick={() => toggleDescription(notification)}
            >
              <div className="flex items-start">
                <span
                  className={`material-symbols-outlined ${
                    !notification.isRead ||
                    !notification?.notificationData?.actionDone
                      ? "text-blue-500"
                      : ""
                  } mr-2`}
                >
                  circle_notifications
                </span>

                <div className="flex flex-col w-full">
                  <div className="flex justify-between">
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          !notification.isRead && "text-blue-700"
                        } first-letter:capitalize`}
                      >
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {timeAgo(notification.updatedAt.toString())}
                      </p>
                    </div>
                    {notification?.notificationData?.actionDone && (
                      <span className="material-symbols-outlined text-green-500">
                        done
                      </span>
                    )}
                    {notification.matchId !==
                      `${user?.id}_onboard_walletAddress` && (
                      <ToolTip
                        title={
                          notification.isRead
                            ? "Mark as unread"
                            : "Mark as read"
                        }
                      >
                        <span
                          className={`material-symbols-outlined ${
                            notification.isRead ? "" : "text-blue-500"
                          }`}
                          style={{ fontSize: "20px", cursor: "pointer" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRead(notification);
                          }}
                        >
                          {notification.isRead
                            ? "mark_chat_read"
                            : "mark_chat_unread"}
                        </span>
                      </ToolTip>
                    )}
                  </div>
                  {expandedId === notification.id && (
                    <div className="mt-2 flex flex-col space-y-2">
                      <p className="text-sm text-gray-500">
                        {notification.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {notification.notificationData?.actions?.map(
                          (action: IAction, index: number) => {
                            return notification.notificationData
                              .actionDone ? null : (
                              <Link
                                key={`${index}-${notification.id}-action`}
                                className="text-sm text-white bg-blue-600 py-1 px-3 rounded hover:bg-blue-700 transition"
                                href={action?.trigger}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {action.title}
                              </Link>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsList;
