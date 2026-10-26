/// <reference lib="webworker" />
// The portal's service worker, bundled by Serwist into /public/sw.js.
//
// - Updates silently: a new deploy's worker takes over straight away
//   (skipWaiting + clientsClaim), so there is no "new version" popup.
// - Caches static files for speed and shows /~offline when there is no network.
// - Shows web push notifications sent by lib/push/server.ts.
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { NetworkOnly, Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  // Only precache the offline page. The app's JS chunks are cached as they are
  // used, so a deploy doesn't make every device re-download the whole app.
  precacheEntries: (self.__SW_MANIFEST ?? []).filter((entry) => {
    const url = typeof entry === 'string' ? entry : entry.url;
    return !url.startsWith('/_next/');
  }),
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Never keep API responses in the cache: they hold per-user data.
    {
      matcher: ({ sameOrigin, url }) =>
        sameOrigin && url.pathname.startsWith('/api/'),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

serwist.addEventListeners();

// Caches left behind by the old next-pwa worker. "apis" held per-user data.
const LEGACY_CACHES = ['start-url', 'apis'];
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all(LEGACY_CACHES.map((name) => caches.delete(name))),
  );
});

/* ---------------------------- Push notifications --------------------------- */

/** What lib/push/server.ts sends. Only `title` is required. */
type PushPayload = {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  icon?: string;
  actions?: { action: string; title: string }[];
  /** Where each action button goes, by its `action`. */
  actionUrls?: Record<string, string>;
};

const readPayload = (event: PushEvent): PushPayload => {
  if (!event.data) return {};
  try {
    return event.data.json();
  } catch {
    return { body: event.data.text() };
  }
};

/** Shows the number of unread notifications on the installed app's icon. */
const syncAppBadge = async () => {
  const nav = self.navigator as Navigator & {
    setAppBadge?: (count?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  if (!nav.setAppBadge || !nav.clearAppBadge) return;
  const open = await self.registration.getNotifications();
  try {
    if (open.length > 0) await nav.setAppBadge(open.length);
    else await nav.clearAppBadge();
  } catch {
    // Badging is best-effort.
  }
};

self.addEventListener('push', (event) => {
  const data = readPayload(event);
  event.waitUntil(
    self.registration
      .showNotification(data.title || 'Portal', {
        body: data.body,
        icon: data.icon || '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: data.tag,
        data: { url: data.url || '/', actionUrls: data.actionUrls ?? {} },
        // `actions` is missing from TypeScript's NotificationOptions.
        ...(data.actions?.length && { actions: data.actions }),
      } as NotificationOptions)
      .then(syncAppBadge),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data ?? {};
  // A button press goes to that button's page, a tap anywhere else to `url`.
  const target = new URL(
    (event.action && data.actionUrls?.[event.action]) || data.url || '/',
    self.location.origin,
  ).href;

  event.waitUntil(
    (async () => {
      // Reuse an open portal window when there is one.
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const existing = windows.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (existing) {
        await existing.focus();
        if (existing.url !== target) await existing.navigate(target);
      } else {
        await self.clients.openWindow(target);
      }
      await syncAppBadge();
    })(),
  );
});

self.addEventListener('notificationclose', (event) => {
  event.waitUntil(syncAppBadge());
});

// Browsers can rotate a subscription. Re-subscribe here; the app sends the
// current subscription to the server each time it opens (see pushService.ts),
// and the server drops endpoints that have expired.
self.addEventListener('pushsubscriptionchange', ((event: Event) => {
  const change = event as ExtendableEvent & {
    oldSubscription?: PushSubscription | null;
    newSubscription?: PushSubscription | null;
  };
  if (change.newSubscription) return;
  const applicationServerKey =
    change.oldSubscription?.options.applicationServerKey;
  if (!applicationServerKey) return;
  change.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    }),
  );
}) as EventListener);
