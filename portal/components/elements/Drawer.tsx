import * as React from 'react';
import Drawer from '@mui/material/Drawer';

const CustomDrawer = ({
  open,
  onClose,
  children,
  height = 'auto',
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: string;
}) => (
  <Drawer
    anchor="bottom"
    open={open}
    onClose={onClose}
    sx={{
      '.MuiDrawer-paper': {
        backgroundColor: '#fff',
        padding: '24px',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
        height,
      },
    }}
  >
    <div className="absolute right-0 top-4 hidden w-10 cursor-pointer text-neutral-900 hover:text-neutral-700 max-sm:block">
      <span className="material-icons !text-3xl md:!text-2xl" onClick={onClose}>
        close_icon
      </span>
    </div>
    <div className="px-2 pb-4 pt-0">{children}</div>
  </Drawer>
);

export default CustomDrawer;
