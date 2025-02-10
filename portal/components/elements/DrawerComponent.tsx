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
    <Drawer anchor="right" open={isOpen} onClose={handleClose}>
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
        role="presentation"
      >
        {isMobile && (
          <div
            className="fixed left-3 top-3 z-50 flex w-full pb-6"
            onClick={handleClose}
          >
            <span className="material-symbols-outlined rounded-full border bg-white p-1 !text-[rgba(0,0,0,0.8)] shadow-md">
              close
            </span>
          </div>
        )}
        {children}
      </Box>
    </Drawer>
  );
};

export default DrawerComponent;
