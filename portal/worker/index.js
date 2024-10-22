// @ts-check

/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = /** @type {ServiceWorkerGlobalScope & typeof globalThis} */ (
  globalThis
);

let notificationCounter = 0;

sw.addEventListener("push", function (event) {
  // console.log("Push event received", event);
  const data = event.data?.json();
  const options = {
    body: data.body,
    icon: "/logo/logo.png",
    data: {
      url: data.url,
    },
  };

  event.waitUntil(sw.registration.showNotification(data.title, options));

  notificationCounter++;
  // Check if the Badging API is available
  if (navigator.setAppBadge) {
    navigator.setAppBadge(notificationCounter).catch(console.error);
  }
});

sw.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(sw.clients.openWindow(event.notification.data.url));

  if (notificationCounter > 0) {
    notificationCounter--;
  }

  updateBadge();
});

// Event listener for when the user manually clears the notification
sw.addEventListener("notificationclose", function (event) {
  if (notificationCounter > 0) {
    notificationCounter--;
    updateBadge();
  }
});

function updateBadge() {
  if (notificationCounter === 0) {
    if (navigator.clearAppBadge) {
      navigator.clearAppBadge().catch(console.error);
    }
  } else {
    if (navigator.setAppBadge) {
      navigator.setAppBadge(notificationCounter).catch(console.error);
    }
  }
}

// sw.addEventListener("pushsubscriptionchange", function (event) {
//   console.log("Push subscription changed", event);
//   const newSubscription = event.newSubscription;
//   const oldSubscription = event.oldSubscription;
//   if (oldSubscription) {
//     deletePushSubscriptionFromServer(
//       sw.registration.scope,
//       oldSubscription.toJSON()
//     );
//   }
//   if (newSubscription) {
//     sendPushSubscriptionToServer(
//       sw.registration.scope,
//       newSubscription.toJSON()
//     );
//   }
// });
