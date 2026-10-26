import { PortalSdk } from '../PortalSdk';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || '';
const REGISTER_URL = '/api/push-notification/register-push';

/** Thrown when the user (or their browser settings) blocks notifications. */
export class PushPermissionError extends Error {}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(b64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

const sameKey = (a: ArrayBuffer | null, b: Uint8Array) =>
  !!a &&
  a.byteLength === b.byteLength &&
  new Uint8Array(a).every((v, i) => v === b[i]);

export const isPushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

/**
 * iPhones and iPads only allow web push once Portal is added to the home
 * screen (Share, then "Add to Home Screen").
 */
export const needsHomeScreenInstall = () => {
  if (typeof window === 'undefined') return false;
  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return isIos && !standalone;
};

/** The active service worker, or null when there is none (e.g. in dev). */
async function getRegistration() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return navigator.serviceWorker.ready;
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  const registration = await getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

/** Ask for permission, subscribe this browser and save it for the signed-in user. */
export async function registerPushNotification() {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser.');
  }
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('Push notifications are not configured.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new PushPermissionError();

  const registration = await getRegistration();
  if (!registration) {
    throw new Error('The service worker is not running yet. Reload and retry.');
  }

  const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  let subscription = await registration.pushManager.getSubscription();
  // A subscription made with an old key can't receive our pushes.
  if (
    subscription &&
    !sameKey(subscription.options.applicationServerKey, key)
  ) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  });

  await PortalSdk.postData(REGISTER_URL, {
    newSubscription: subscription.toJSON(),
  });
  return subscription;
}

export async function unregisterPushNotification() {
  const subscription = await getCurrentPushSubscription();
  if (!subscription) return;
  await PortalSdk.deleteData(REGISTER_URL, {
    subscriptionToDelete: { endpoint: subscription.endpoint },
  });
  await subscription.unsubscribe();
}

/**
 * Tell the server about this browser's current subscription. Browsers can
 * rotate subscriptions on their own, so the app calls this when it opens.
 */
export async function syncPushSubscription() {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  const subscription = await getCurrentPushSubscription();
  if (!subscription) return;
  await PortalSdk.postData(REGISTER_URL, {
    newSubscription: subscription.toJSON(),
  });
}

export async function sendTestPushNotification() {
  return PortalSdk.postData('/api/push-notification/test', {});
}
