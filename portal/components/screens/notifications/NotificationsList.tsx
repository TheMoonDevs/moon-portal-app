'use client';
import { Notification } from '@prisma/client';
import React, { useState } from 'react';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';

export const timeAgo = (timestamp: string) => {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
};

const NotificationsList = ({
  notifications,
}: {
  notifications: Notification[];
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
          {notifications.map((notification: Notification) => (
            <div
              key={notification.id}
              className='flex items-start p-3 bg-gray-100 rounded-lg shadow hover:bg-gray-200 transition cursor-pointer'
              onClick={() => toggleDescription(notification.id)}
            >
              <span className='material-symbols-outlined text-blue-500 mr-2'>
                circle_notifications
              </span>
              <div className='flex flex-col'>
                <p className='text-sm font-semibold text-blue-700 first-letter:capitalize'>
                  {notification.title}
                </p>
                <p className='text-xs text-gray-500 mt-1'>
                  {timeAgo(notification.updatedAt.toString())}
                </p>
                <div
                  className={`transition-all overflow-hidden ${
                    expandedId === notification.id ? 'max-h-[100px]' : 'max-h-0'
                  }`}
                >
                  <p className='text-xs text-gray-500 mt-1'>
                    {notification.description}
                  </p>
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
