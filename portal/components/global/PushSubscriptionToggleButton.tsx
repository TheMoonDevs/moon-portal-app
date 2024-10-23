"use client";
import { useUser } from "@/utils/hooks/useUser";
import {
  getCurrentPushSubscription,
  registerPushNotification,
  unregisterPushNotification,
} from "@/utils/services/notifications/pushService";
import { CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";

const PushSubscriptionToggleButton = () => {
  const [hasActivePushSubscription, setHasActivePushSubscription] =
    useState<boolean>();
  const [loading, setLoading] = useState<boolean>(false);

  const { user } = useUser();

  useEffect(() => {
    const getActivePushSubscription = async () => {
      try {
        const subscription = await getCurrentPushSubscription();
        setHasActivePushSubscription(!!subscription);
      } catch (error) {
        console.error(error);
      }
    };
    getActivePushSubscription();
  }, []);

  const setPushNotificationsEnabled = async (enabled: boolean) => {
    if (!user?.id) return;
    if (loading) return;
    try {
      setLoading(true);

      if (enabled) {
        try {
          await registerPushNotification(user?.id);
        } catch (error) {
          const activeSubscription = await getCurrentPushSubscription();
          if (activeSubscription) {
            activeSubscription.unsubscribe();
          }
          throw error;
        }
      } else {
        await unregisterPushNotification(user?.id);
      }
      setHasActivePushSubscription(enabled);
      if (enabled) {
        toast.success("Push notifications enabled");
      } else {
        toast.warning("Push notifications disabled");
      }
    } catch (error) {
      console.error(error);
      if (enabled && Notification.permission === "denied") {
        toast.error(
          "Please enable push notifications in your browser settings."
        );
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (hasActivePushSubscription === undefined) return null;

  return (
    <div className="relative flex items-start justify-center">
      {hasActivePushSubscription ? (
        <span
          onClick={() => setPushNotificationsEnabled(false)}
          title="Disable push notifications"
          className={`icon_size material-symbols-outlined cursor-pointer ${
            loading ? "opacity-40" : "opacity-100"
          }`}
        >
          notifications_active
        </span>
      ) : (
        <span
          onClick={() => setPushNotificationsEnabled(true)}
          title="Enable push notifications"
          className={`icon_size material-symbols-outlined cursor-pointer ${
            loading ? "opacity-10" : "opacity-100"
          }`}
        >
          notifications_off
        </span>
      )}
      {loading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <CircularProgress
            size={12}
            sx={{ width: "inherit", height: "inherit" }}
            color="inherit"
          />
        </div>
      )}
      <Toaster position="bottom-left" richColors duration={3000} />
    </div>
  );
};

export default PushSubscriptionToggleButton;
