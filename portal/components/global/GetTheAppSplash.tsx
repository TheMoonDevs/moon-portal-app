'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/*
 * On a phone's browser, the Portal first offers the store app: a splash
 * with App Store and Google Play links, and a quiet "Continue to website".
 * Either choice is remembered for a while, so it doesn't come back on every
 * page. The store links come from /api/mobile/config (MOBILE_APP_STORE_URL,
 * MOBILE_PLAY_STORE_URL), the same ones the app uses; a store without a
 * link isn't shown. Pages people reach from outside (applying, signing,
 * booking, the legal pages) never show it.
 */

const SKIP_PATHS = [
  '/apply',
  '/task',
  '/join',
  '/sign',
  '/verify',
  '/meet/',
  '/policies',
  '/privacy',
  '/terms',
  '/delete-account',
  '/support',
  '/~offline',
  '/oauth',
];

const STORAGE_KEY = 'portal:get-the-app:dismissed-at';
const QUIET_FOR_MS = 7 * 24 * 60 * 60 * 1000;

type Platform = 'ios' | 'android';
type StoreUrls = { ios: string | null; android: string | null };

const phonePlatform = (): Platform | null => {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipod|ipad/i.test(ua)) return 'ios';
  // iPadOS asks for the desktop site and says "Macintosh".
  if (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return 'ios';
  return null;
};

const dismissedRecently = () => {
  try {
    const at = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    return Date.now() - at < QUIET_FOR_MS;
  } catch {
    return false;
  }
};

const remember = () => {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // private mode: it shows again next visit, which is fine
  }
};

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7 fill-current">
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current">
    <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
  </svg>
);

const STORES: Record<
  Platform,
  { small: string; name: string; Icon: () => JSX.Element }
> = {
  ios: { small: 'Download on the', name: 'App Store', Icon: AppleIcon },
  android: { small: 'Get it on', name: 'Google Play', Icon: PlayIcon },
};

export const GetTheAppSplash = () => {
  const pathname = usePathname() ?? '/';
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [urls, setUrls] = useState<StoreUrls | null>(null);
  const [open, setOpen] = useState(false);

  const skipped = SKIP_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`),
  );

  useEffect(() => {
    if (skipped || open || dismissedRecently()) return;
    const found = phonePlatform();
    if (!found) return;
    let cancelled = false;
    fetch('/api/mobile/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        const storeUrls: StoreUrls | undefined = body?.data?.storeUrls;
        if (cancelled || !storeUrls || (!storeUrls.ios && !storeUrls.android))
          return;
        setPlatform(found);
        setUrls(storeUrls);
        setOpen(true);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipped]);

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  if (!open || skipped || !urls || !platform) return null;

  const close = () => {
    remember();
    setOpen(false);
  };

  // This phone's store first.
  const order: Platform[] =
    platform === 'ios' ? ['ios', 'android'] : ['android', 'ios'];
  const stores = order.filter((p) => urls[p]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="get-the-app-title"
      className="fixed inset-0 z-[120] flex flex-col overflow-y-auto bg-black text-[#f2f0e8]"
      style={{
        backgroundImage:
          'radial-gradient(120% 60% at 50% 100%, #1b1b20 0%, #000 70%)',
      }}
    >
      <div className="flex flex-1 flex-col items-center px-6 pb-6 pt-[max(2.5rem,env(safe-area-inset-top))] text-center">
        <img src="/brand/portal-logo.svg" alt="" className="size-12" />
        <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#2c2d31] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a6a8ae]">
          <span className="size-1.5 rounded-full bg-[#3ddc84]" />
          Now available
        </span>
        <h2
          id="get-the-app-title"
          className="mt-4 text-[32px] font-bold leading-[1.05] tracking-[-0.03em]"
        >
          Portal is now
          <br />
          on your phone.
        </h2>
        <p className="mt-3 max-w-xs text-[15px] leading-snug text-[#a6a8ae]">
          Tasks, worklogs, meetings and team chat, with notifications, in the
          app.
        </p>

        <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
          {stores.map((p) => {
            const { small, name, Icon } = STORES[p];
            return (
              <a
                key={p}
                href={urls[p]!}
                onClick={remember}
                className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-[#f2f0e8] px-5 text-[#0b0c10] active:opacity-80"
              >
                <Icon />
                <span className="text-left leading-tight">
                  <span className="block text-[11px] font-medium">{small}</span>
                  <span className="block text-[19px] font-bold tracking-[-0.01em]">
                    {name}
                  </span>
                </span>
              </a>
            );
          })}
        </div>

        <div className="relative mt-8 flex w-full flex-1 items-end justify-center overflow-hidden">
          <img
            src="/app-launch/phone-home.webp"
            alt="The Portal app's home screen"
            className="max-h-[38vh] w-auto max-w-[62vw] rounded-t-[28px] shadow-[0_0_0_1px_#2c2d31,0_-20px_60px_rgba(0,0,0,.8)]"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={close}
        className="sticky bottom-0 w-full border-t border-[#151517] bg-black/90 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-sm text-[#a6a8ae]/80 backdrop-blur hover:text-[#a6a8ae]"
      >
        Continue to website
      </button>
    </div>
  );
};
