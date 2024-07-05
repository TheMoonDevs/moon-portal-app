import React, { useEffect, useState } from 'react';
import { Modal, Box } from '@mui/material';
import { Notification } from '@prisma/client';
import { timeAgo } from '../screens/notifications/NotificationsScreen';

const style = (left: number) => ({
  position: 'absolute' as 'absolute',
  bottom: '16px',
  left: `${left}px`,
  width: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  // p: 2,
  outline: 'none',
  borderRadius: '8px',
  marginLeft: '16px',
  minHeight: '400px',
  maxHeight: '500px',
  overflowY: 'scroll',
});

interface NotificationModalProps {
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  open,
  onClose,
  notifications,
}) => {
  const [leftPosition, setLeftPosition] = useState<number>(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleDescription = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  useEffect(() => {
    const bottombar = document.querySelector('.bottombar');
    if (bottombar) {
      const bottombarRect = bottombar.getBoundingClientRect();
      setLeftPosition(bottombarRect.right);
    }
  }, []);

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby='notification-modal-title'
      aria-describedby='notification-modal-description'
    >
      <Box sx={style(leftPosition)} className='no-scrollbar'>
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
        <div className='p-4'>
          {notifications.length === 0 ? (
            <div className='flex flex-col items-center justify-center bg-gray-50 p-6 rounded-lg border border-gray-200'>
              <span className='material-symbols-outlined text-gray-600 text-4xl mb-2'>
                notifications
              </span>
              <span className='text-gray-500 text-lg'>No notifications</span>
            </div>
          ) : (
            <div className='space-y-2'>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className='flex items-start p-3 bg-gray-100 rounded-lg shadow transition duration-300 ease-in-out hover:bg-gray-200 cursor-pointer'
                  onClick={() => toggleDescription(notification.id)}
                >
                  <span className='material-symbols-outlined text-blue-500 mr-2'>
                    circle_notifications
                  </span>
                  <div className='flex flex-col'>
                    <p className='text-sm font-semibold first-letter:capitalize text-blue-700'>
                      {notification.title}
                    </p>
                    <p className='text-xs text-gray-500 mt-1 first-letter:capitalize'>
                      {timeAgo(notification.createdAt.toString())}
                    </p>
                    <div
                      className={`transition-all overflow-hidden ${
                        expandedId === notification.id
                          ? 'max-h-[100px]'
                          : 'max-h-0'
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
      </Box>
    </Modal>
  );
};

export default NotificationModal;
