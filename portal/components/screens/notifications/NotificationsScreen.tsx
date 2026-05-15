'use client';
import React from 'react';

import NotificationsList from './NotificationsList';

const NotificationsScreen = () => {
  return (
    <div className="no-scrollbar h-[calc(100vh-3rem)] overflow-y-scroll">
      <NotificationsList />
    </div>
  );
};

export default NotificationsScreen;
