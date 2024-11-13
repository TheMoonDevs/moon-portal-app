import { getReadyServiceWorker } from "@/utils/helpers/serviceWorker";
import { PortalSdk } from "../PortalSdk";

// Helper function to convert the public key to Uint8Array format
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(b64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  const sw = await getReadyServiceWorker();
  return sw.pushManager.getSubscription();
}

export async function registerPushNotification(userId: string) {
  if (!("PushManager" in window)) {
    throw new Error("Push notifications are not supported in this browser.");
  }
  const existingSubscription = await getCurrentPushSubscription();
  if (existingSubscription) {
    throw Error("Push notification already registered");
  }

  const sw = await getReadyServiceWorker();
  const subscription = await sw.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || ""
    ),
  });
  await sendPushSubscriptionToServer(userId, subscription);
}

export async function unregisterPushNotification(userId: string) {
  const existingSubscription = await getCurrentPushSubscription();

  if (!existingSubscription) {
    throw Error("No existing push subscription found");
  }

  await deletePushSubscriptionFromServer(userId, existingSubscription);
  await existingSubscription.unsubscribe();
}

export async function sendPushSubscriptionToServer(
  userId: string,
  subscription: PushSubscription
) {
  // console.log("send push subscription to server", subscription);
  const response = await PortalSdk.postData(
    "/api/push-notification/register-push",
    {
      userId,
      newSubscription: subscription,
    }
  );
}

export async function deletePushSubscriptionFromServer(
  userId: string,
  subscription: PushSubscription
) {
  // console.log(userId);
  // console.log("delete push subscription from server", subscription);
  const response = await PortalSdk.deleteData(
    "/api/push-notification/register-push",
    {
      userId,
      subscriptionToDelete: subscription,
    }
  );
}
