"use client";

import { useState, SyntheticEvent, useEffect } from "react";
import Snackbar from "@mui/material/Snackbar";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { popToast, pushToast, setGlobalToast } from "@/utils/redux/ui/ui.slice";
import { Alert } from "@mui/material";

export enum ToastSeverity {
  success = "success",
  info = "info",
  warning = "warning",
  error = "error",
}

export const useMoonToast = () => {
  const dispatch = useAppDispatch();
  const [toastMsg, setToastMsg] = useState<string>("");
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
    <div className={`absolute ${position || "top-2 right-2"}`}>
      <div
        id="toast-default"
        className="flex items-center w-full max-w-xs p-4 text-gray-500 bg-white rounded-lg shadow "
        role="alert"
      >
        {icon && (
          <div
            className={`inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-${color}-500 bg-${color}-100 rounded-lg `}
          >
            <span className="material-icons">{icon}</span>
          </div>
        )}
        <div className="ms-3 text-sm font-normal">{message}</div>
        {isHidable && (
          <button
            type="button"
            className="ms-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex items-center justify-center h-8 w-8 "
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
  severity = "success",
}: {
  message: string;
  action?: string;
  duration?: number;
  position: {
    vertical: "top" | "bottom";
    horizontal: "left" | "center" | "right";
  };
  severity: "success" | "info" | "warning" | "error" | undefined;
}) => {
  const dispatch = useAppDispatch();
  const globalToast = useAppSelector((state) => state.ui.globalToast);

  const handleClick = () => {
    dispatch(setGlobalToast(true));
  };

  const handleClose = (event: SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") {
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
      <Alert onClose={handleClose} severity={severity} sx={{ width: "100%" }}>
        {message}
      </Alert>
    </Snackbar>
  );
};
