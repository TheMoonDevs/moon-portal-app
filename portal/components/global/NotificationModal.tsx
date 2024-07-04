// components/NotificationModal.tsx
import React, { useEffect, useState } from 'react';
import { Modal, Box } from '@mui/material';
import { Notification } from '@prisma/client';

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
  height: '400px',
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
      <Box sx={style(leftPosition)}>
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
                >
                  <span className='material-symbols-outlined text-blue-500 mr-2'>
                    circle_notifications
                  </span>
                  <div className='flex flex-col'>
                    <p className='text-sm font-semibold first-letter:capitalize'>
                      {notification.title}
                    </p>
                    <p className='text-xs text-gray-600 overflow-hidden overflow-ellipsis max-w-xs'>
                      {notification.description}
                    </p>
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
