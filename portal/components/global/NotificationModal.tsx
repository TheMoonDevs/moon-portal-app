import React, { useEffect, useState } from 'react';
import { Modal, Box } from '@mui/material';
import { Notification } from '@prisma/client';
import NotificationsList from '../screens/notifications/NotificationsList';

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
        <NotificationsList notifications={notifications} />
      </Box>
    </Modal>
  );
};

export default NotificationModal;
