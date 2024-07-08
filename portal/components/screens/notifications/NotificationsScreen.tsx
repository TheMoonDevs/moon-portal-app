'use client';
import { useNotifications } from '@/utils/hooks/useNotifications';
import React from 'react';
import NotificationsList from './NotificationsList';

const NotificationsScreen = () => {
  const { notifications } = useNotifications();

  return (
    <div className='h-[calc(100vh-3rem)] overflow-y-scroll no-scrollbar'>
      <NotificationsList notifications={notifications} />
    </div>
  );
};

export default NotificationsScreen;
