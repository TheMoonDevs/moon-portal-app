'use client';
import type { Notification } from '@db/client';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import Link from 'next/link';
import React, { useState } from 'react';

import ToolTip from '@/components/elements/ToolTip';
import { useNotifications } from '@/utils/hooks/useNotifications';

import { MeetRequestActions } from './MeetRequestActions';

export interface INotification extends Omit<Notification, 'notificationData'> {
  notificationData: INotificationData;
}

export interface INotificationData {
  actions: IAction[];
  actionDone: boolean;
  /** `MEET_REQUEST`: a meeting request the user can answer in place. */
  kind?: string;
  bookingId?: string;
}

export interface IAction {
  title: string;
  trigger_type: string;
  trigger: string;
}

export const timeAgo = (timestamp?: string | Date | null) => {
  const date = timestamp ? new Date(timestamp) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return formatDistanceToNow(date, { addSuffix: true });
};

const NotificationsList = () => {
  const {
    notifications,
    unreadNotificationsCount,
    isLoading,
    toggleNotificationRead,
    markAsRead,
    handleMarkAllAsRead,
    removeNotification,
    clearAllNotifications,
    refresh,
  } = useNotifications();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const toggleDescription = (notification: INotification) => {
    if (expandedId === notification.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(notification.id);
    markAsRead(notification);
  };

  const clearAll = () => {
    if (!confirmingClear) {
      setConfirmingClear(true);
      return;
    }
    setConfirmingClear(false);
    setExpandedId(null);
    clearAllNotifications();
  };

  return (
    <div className="">
      <div className="sticky top-0 z-10 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-lg font-bold">Notifications</h4>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex items-center gap-1 rounded p-2 text-xs text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleMarkAllAsRead}
              disabled={unreadNotificationsCount === 0}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '16px' }}
              >
                done_all
              </span>
              Mark all as read
            </button>
            <button
              type="button"
              className={`flex items-center gap-1 rounded p-2 text-xs hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 ${
                confirmingClear ? 'font-semibold text-red-600' : 'text-gray-600'
              }`}
              onClick={clearAll}
              onBlur={() => setConfirmingClear(false)}
              disabled={notifications.length === 0}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '16px' }}
              >
                delete_sweep
              </span>
              {confirmingClear ? 'Tap again to clear' : 'Clear all'}
            </button>
          </div>
        </div>
      </div>
      {notifications.length === 0 ? (
        <div className="mx-4 flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6">
          <span className="material-symbols-outlined mb-2 text-4xl text-gray-600">
            notifications
          </span>
          <span className="text-lg text-gray-500">
            {isLoading ? 'Loading…' : 'No notifications'}
          </span>
        </div>
      ) : (
        <div className="space-y-2 p-4">
          {notifications.map((notification: INotification) => (
            <div
              key={notification.id}
              className={`flex cursor-pointer flex-col rounded-lg p-3 shadow transition hover:bg-gray-200 ${
                notification.isRead ? 'bg-white' : 'bg-gray-100'
              }`}
              onClick={() => toggleDescription(notification)}
            >
              <div className="flex items-start">
                <span
                  className={`material-symbols-outlined mr-2 ${
                    notification.isRead ? 'text-gray-400' : 'text-blue-500'
                  }`}
                >
                  circle_notifications
                </span>

                <div className="flex w-full min-w-0 flex-col">
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold first-letter:capitalize ${
                          notification.isRead ? '' : 'text-blue-700'
                        }`}
                      >
                        {notification.title}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {timeAgo(
                          (notification.createdAt ??
                            notification.updatedAt) as string,
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-start gap-1">
                      {notification?.notificationData?.actionDone && (
                        <span className="material-symbols-outlined text-green-500">
                          done
                        </span>
                      )}
                      <ToolTip
                        title={
                          notification.isRead
                            ? 'Mark as unread'
                            : 'Mark as read'
                        }
                      >
                        <button
                          type="button"
                          aria-label={
                            notification.isRead
                              ? 'Mark as unread'
                              : 'Mark as read'
                          }
                          className={`material-symbols-outlined rounded p-0.5 hover:bg-gray-300 ${
                            notification.isRead
                              ? 'text-gray-500'
                              : 'text-blue-500'
                          }`}
                          style={{ fontSize: '20px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleNotificationRead(notification);
                          }}
                        >
                          {notification.isRead
                            ? 'mark_chat_read'
                            : 'mark_chat_unread'}
                        </button>
                      </ToolTip>
                      <ToolTip title="Remove">
                        <button
                          type="button"
                          aria-label="Remove notification"
                          className="material-symbols-outlined rounded p-0.5 text-gray-500 hover:bg-gray-300 hover:text-red-600"
                          style={{ fontSize: '20px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (expandedId === notification.id)
                              setExpandedId(null);
                            removeNotification(notification);
                          }}
                        >
                          close
                        </button>
                      </ToolTip>
                    </div>
                  </div>
                  {expandedId === notification.id && (
                    <div className="mt-2 flex flex-col space-y-2">
                      <p className="whitespace-pre-wrap text-sm text-gray-500">
                        {notification.description}
                      </p>
                      {!notification.notificationData?.actionDone &&
                        notification.notificationData?.kind ===
                          'MEET_REQUEST' &&
                        notification.notificationData.bookingId && (
                          <MeetRequestActions
                            bookingId={notification.notificationData.bookingId}
                            onDone={refresh}
                          />
                        )}
                      {!notification.notificationData?.actionDone &&
                        notification.notificationData?.kind !==
                          'MEET_REQUEST' && (
                          <div className="flex flex-wrap gap-2">
                            {notification.notificationData?.actions?.map(
                              (action: IAction, index: number) => (
                                <Link
                                  key={`${index}-${notification.id}-action`}
                                  className="rounded bg-blue-600 px-3 py-1 text-sm text-white transition hover:bg-blue-700"
                                  href={action?.trigger}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {action.title}
                                </Link>
                              ),
                            )}
                          </div>
                        )}
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
