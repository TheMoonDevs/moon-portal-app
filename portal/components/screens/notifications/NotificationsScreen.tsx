'use client';
import React from 'react';
import NotificationsList from './NotificationsList';

const NotificationsScreen = () => {

  return (
    <div className='h-[calc(100vh-3rem)] overflow-y-scroll no-scrollbar'>
      <NotificationsList />
    </div>
  );
};

export default NotificationsScreen;
