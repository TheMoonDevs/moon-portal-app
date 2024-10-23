'use client';
import { Notification } from '@prisma/client';
import React, { useState } from 'react';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import Link from 'next/link';
import ToolTip from '@/components/elements/ToolTip';
import { useUser } from '@/utils/hooks/useUser';
import { useNotifications } from '@/utils/hooks/useNotifications';

export interface INotification extends Omit<Notification, 'notificationData'> {
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
  const { notifications, toggleNotificationRead, handleMarkAllAsRead } =
    useNotifications();
  // console.log(notifications);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const hasUnreadNotifications = notifications.some(
    (notification: INotification) => !notification?.isRead,
  );
  const { user } = useUser();

  const toggleDescription = (notification: INotification) => {
    if (expandedId === notification.id) {
      setExpandedId(null);
    } else {
      setExpandedId(notification.id);

      if (!notification.isRead) {
        toggleNotificationRead(notification);
      }
    }
  };

  return (
    <div className="">
      <div className="sticky top-0 z-10 bg-white p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold">Notifications</h4>
          <button
            className={`flex items-center gap-1 p-2 text-xs text-gray-600 ${
              !hasUnreadNotifications ? 'cursor-not-allowed opacity-50' : ''
            }`}
            onClick={handleMarkAllAsRead}
            disabled={!hasUnreadNotifications}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '16px' }}
            >
              done_all
            </span>
            Mark all as read
          </button>
        </div>
      </div>
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6">
          <span className="material-symbols-outlined mb-2 text-4xl text-gray-600">
            notifications
          </span>
          <span className="text-lg text-gray-500">No notifications</span>
        </div>
      ) : (
        <div className="space-y-2 p-4">
          {notifications.map((notification: INotification) => (
            <div
              key={notification.id}
              className={`flex flex-col p-3 ${
                (!notification.isRead ||
                  !notification?.notificationData?.actionDone) &&
                'bg-gray-100'
              } cursor-pointer rounded-lg shadow transition hover:bg-gray-200`}
              onClick={() => toggleDescription(notification)}
            >
              <div className="flex items-start">
                <span
                  className={`material-symbols-outlined ${
                    !notification.isRead ||
                    !notification?.notificationData?.actionDone
                      ? 'text-blue-500'
                      : ''
                  } mr-2`}
                >
                  circle_notifications
                </span>

                <div className="flex w-full flex-col">
                  <div className="flex justify-between">
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          !notification.isRead && 'text-blue-700'
                        } first-letter:capitalize`}
                      >
                        {notification.title}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
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
                            ? 'Mark as unread'
                            : 'Mark as read'
                        }
                      >
                        <span
                          className={`material-symbols-outlined ${
                            notification.isRead ? '' : 'text-blue-500'
                          }`}
                          style={{ fontSize: '20px', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleNotificationRead(notification);
                          }}
                        >
                          {notification.isRead
                            ? 'mark_chat_read'
                            : 'mark_chat_unread'}
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
                                className="rounded bg-blue-600 px-3 py-1 text-sm text-white transition hover:bg-blue-700"
                                href={action?.trigger}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {action.title}
                              </Link>
                            );
                          },
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
