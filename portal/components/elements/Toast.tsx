'use client';

import { Alert } from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import type { SyntheticEvent } from 'react';
import { useState } from 'react';

import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import { popToast, pushToast, setGlobalToast } from '@/utils/redux/ui/ui.slice';

export enum ToastSeverity {
  success = 'success',
  info = 'info',
  warning = 'warning',
  error = 'error',
}

export const useMoonToast = () => {
  const dispatch = useAppDispatch();
  const [toastMsg, setToastMsg] = useState<string>('');
  const [toastSev, setToastSev] = useState<ToastSeverity>();
  const showToast = (msg: string, severity: ToastSeverity) => {
    dispatch(setGlobalToast(true));
    setToastSev(severity);
    setToastMsg(msg);
  };

  return {
    showToast,
    toastMsg,
    toastSev,
  };
};

export const useToast = () => {
  const dispatch = useAppDispatch();
  const showToast = (toastParams: {
    id: string;
    icon?: string;
    message: string;
    isHidable?: boolean;
    color?: string;
    position?: string;
    bgColor?: string;
  }) => {
    dispatch(pushToast(toastParams));
    setTimeout(() => {
      dispatch(popToast(toastParams.id));
    }, 3000);
  };
  return {
    showToast,
  };
};

export const ToastsContainer = () => {
  const toasts = useAppSelector((state) => state.ui.toasts);
  const dispatch = useAppDispatch();

  return (
    <div>
      {toasts.map((toast) => (
        <SimpleToast
          key={toast.id}
          icon={toast.icon}
          message={toast.message}
          isHidable={toast.isHidable}
          color={toast.color}
          position={toast.position}
          onClose={() => {
            dispatch(popToast(toast.id));
          }}
        />
      ))}
    </div>
  );
};

export const SimpleToast = ({
  icon,
  message,
  isHidable,
  color,
  position,
  onClose,
}: any) => {
  return (
    <div className={`absolute ${position || 'right-2 top-2'}`}>
      <div
        id="toast-default"
        className="flex w-full max-w-xs items-center rounded-lg bg-white p-4 text-gray-500 shadow"
        role="alert"
      >
        {icon && (
          <div
            className={`text- inline-flex size-8 shrink-0 items-center justify-center${color}-500 bg-${color}-100 rounded-lg`}
          >
            <span className="material-icons">{icon}</span>
          </div>
        )}
        <div className="ms-3 text-sm font-normal">{message}</div>
        {isHidable && (
          <button
            type="button"
            className="-m-1.5 ms-auto inline-flex size-8 items-center justify-center rounded-lg bg-white p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-gray-300"
            data-dismiss-target="#toast-default"
            onClick={onClose}
          >
            <span className="sr-only">Close</span>
          </button>
        )}
      </div>
    </div>
  );
};

export const MoonToast = ({
  message,
  action,
  position,
  duration = 2000,
  severity = 'success',
}: {
  message: string;
  action?: string;
  duration?: number;
  position: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
  severity: 'success' | 'info' | 'warning' | 'error' | undefined;
}) => {
  const dispatch = useAppDispatch();
  const globalToast = useAppSelector((state) => state.ui.globalToast);

  const handleClick = () => {
    dispatch(setGlobalToast(true));
  };

  const handleClose = (event: SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }

    dispatch(setGlobalToast(false));
  };

  return (
    <Snackbar
      open={globalToast}
      autoHideDuration={duration}
      onClose={handleClose}
      action={action}
      anchorOrigin={position}
    >
      <Alert onClose={handleClose} severity={severity} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
};
