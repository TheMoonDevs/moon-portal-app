import media from '@/styles/media';
import { Box, Drawer, Fab, useMediaQuery } from '@mui/material';
import React from 'react';

const DrawerComponent = ({
  children,
  isOpen,
  handleClose,
}: {
  children: React.ReactNode;
  isOpen: boolean;
  handleClose: () => void;
}) => {
  const isMobile = useMediaQuery(media.largeMobile);

  return (
    <Drawer anchor='right' open={isOpen} onClose={handleClose}>
      <Box
        sx={{
          width: {
            xs: '100%',
            sm: '400px',
          },
          height: '100%',
          overflowX: 'hidden',
          overflowY: 'scroll',
        }}
        role='presentation'
      >
        {isMobile && (
          <div className='fixed bottom-0 right-0 z-50 w-full flex justify-center pb-6'>
            <Fab
              color='primary'
              aria-label='close'
              size='small'
              onClick={handleClose}
              sx={{
                backgroundColor: 'transparent !important',
                border: '1px solid GrayText !important',
                backdropFilter: 'blur(10px) !important',
                zIndex: 1300,
              }}
            >
              <span className='material-symbols-outlined !text-[rgba(0,0,0,0.8)]'>
                close
              </span>
            </Fab>
          </div>
        )}
        {children}
      </Box>
    </Drawer>
  );
};

export default DrawerComponent;
