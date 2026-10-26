import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Offline - Portal' };

// Shown by the service worker (app/sw.ts) when a page can't load offline.
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-black p-6 text-center text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo/logo_white.png" alt="" className="size-12" />
      <h1 className="text-lg font-semibold">You're offline</h1>
      <p className="max-w-xs text-sm text-neutral-400">
        Portal needs a connection for this page. It will work again as soon as
        you're back online.
      </p>
    </main>
  );
}
