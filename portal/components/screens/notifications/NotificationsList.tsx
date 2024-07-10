'use client';
import { Notification } from '@prisma/client';
import React, { useState } from 'react';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import Link from 'next/link';

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

const NotificationsList = ({
  notifications,
}: {
  notifications: INotification[];
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleDescription = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  return (
    <div className=''>
      <div className='sticky top-0 bg-white z-10 p-4'>
        <div className='flex justify-between items-center'>
          <h4 className='text-lg font-bold'>Notifications</h4>
          <button className='text-xs text-gray-600 flex gap-1 items-center p-2'>
            <span
              className='material-symbols-outlined'
              style={{ fontSize: '16px' }}
            >
              done_all
            </span>
            Mark all as read
          </button>
        </div>
      </div>
      {notifications.length === 0 ? (
        <div className='flex flex-col items-center justify-center bg-gray-50 p-6 rounded-lg border border-gray-200'>
          <span className='material-symbols-outlined text-gray-600 text-4xl mb-2'>
            notifications
          </span>
          <span className='text-gray-500 text-lg'>No notifications</span>
        </div>
      ) : (
        <div className='space-y-2 p-4'>
          {notifications.map((notification: INotification) => (
            <div
              key={notification.id}
              className='flex flex-col p-3 bg-gray-100 rounded-lg shadow hover:bg-gray-200 transition cursor-pointer'
              onClick={() => toggleDescription(notification.id)}
            >
              <div className='flex items-start'>
                <span className='material-symbols-outlined text-blue-500 mr-2'>
                  circle_notifications
                </span>
                <div className='flex flex-col w-full'>
                  <div className='flex justify-between'>
                    <div>
                      <p className='text-sm font-semibold text-blue-700 first-letter:capitalize'>
                        {notification.title}
                      </p>
                      <p className='text-xs text-gray-500 mt-1'>
                        {timeAgo(notification.updatedAt.toString())}
                      </p>
                    </div>
                    {notification?.notificationData?.actionDone && (
                      <span className='material-symbols-outlined text-green-500'>
                        done
                      </span>
                    )}
                  </div>
                  {expandedId === notification.id && (
                    <div className='mt-2 flex flex-col space-y-2'>
                      <p className='text-sm text-gray-500'>
                        {notification.description}
                      </p>
                      <div className='flex flex-wrap gap-2'>
                        {notification.notificationData?.actions?.map(
                          (action: IAction, index: number) => {
                            return notification.notificationData.actionDone ? (
                              <span
                                key={`${index}-${notification.id}-action`}
                                className='text-sm text-white bg-gray-400 py-1 px-3 rounded cursor-not-allowed'
                              >
                                Done
                              </span>
                            ) : (
                              <Link
                                key={`${index}-${notification.id}-action`}
                                className='text-sm text-white bg-blue-600 py-1 px-3 rounded hover:bg-blue-700 transition'
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
