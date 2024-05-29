import React from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

export type toastSeverity = 'error' | 'warning' | 'info' | 'success';

const Toast = ({
  open,
  handleClose,
  message,
  severity,
}: {
  open: boolean;
  handleClose: (event: React.SyntheticEvent<any>, reason?: string) => void;
  message: string;
  severity: toastSeverity;
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert onClose={handleClose} severity={severity} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
};

export default Toast;
