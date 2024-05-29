import { setToast } from "@/utils/redux/quicklinks/quicklinks.slice";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { Alert, Snackbar } from "@mui/material";
import { SyntheticEvent } from "react";

export const QuicklinksToast = ({
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
  const { toast } = useAppSelector((state) => state.quicklinks);

  const handleClose = (event: SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") {
      return;
    }

    dispatch(
      setToast({
        showToast: false,
        message: "",
        severity: undefined,
      })
    );
  };

  return (
    <Snackbar
      open={toast.showToast}
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
