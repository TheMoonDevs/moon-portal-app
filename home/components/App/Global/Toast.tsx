import { useAppDispatch, useAppSelector } from "@/redux/store";
import { setGlobalToast } from "@/redux/ui/ui.slice";
import { Alert, Snackbar } from "@mui/material";
import { SyntheticEvent } from "react";

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