'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/*
 * On a phone, the website first offers the Portal app: both store buttons
 * (this phone's store first) and a quiet "Continue to website". Whichever
 * they pick is remembered for 30 days on that browser. Pages people reach
 * from outside the team (applying, signing, booking a meeting, the legal
 * pages) never show it, and nor does the app's own in-app browser, which
 * opens pages with `inApp=1`. `/app` is the same screen as a link to share,
 * on any device.
 */

type Platform = 'ios' | 'android';
export type StoreUrls = { ios: string; android: string };

const SEEN_KEY = 'portal:app-splash';
const IN_APP_KEY = 'portal:in-app';
const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;

const SKIP_PATHS = [
  '/app',
  '/apply',
  '/task',
  '/join',
  '/sign',
  '/verify',
  '/meet/',
  '/oauth',
  '/policies',
  '/privacy',
  '/terms',
  '/delete-account',
  '/support',
  '/~offline',
];

const skipPath = (pathname: string) =>
  SKIP_PATHS.some((p) =>
    p.endsWith('/')
      ? pathname.startsWith(p)
      : pathname === p || pathname.startsWith(`${p}/`),
  );

const detectPlatform = (): Platform | null => {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  // iPadOS asks for the desktop site and calls itself a Mac.
  if (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return 'ios';
  return null;
};

const read = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode: it shows again next visit, which is fine.
  }
};

const AppleMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current">
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
  </svg>
);

const PlayMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current">
    <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
  </svg>
);

const STORES: Record<
  Platform,
  { mark: () => JSX.Element; small: string; name: string }
> = {
  ios: { mark: AppleMark, small: 'Download on the', name: 'App Store' },
  android: { mark: PlayMark, small: 'Get it on', name: 'Google Play' },
};

/** The download screen itself: shared by the phone splash and `/app`. */
export const AppDownloadScreen = ({
  storeUrls,
  platform,
  onDone,
  continueHref,
}: {
  storeUrls: StoreUrls;
  platform: Platform | null;
  onDone: () => void;
  continueHref?: string;
}) => {
  const order: Platform[] =
    platform === 'android' ? ['android', 'ios'] : ['ios', 'android'];
  const continueClass =
    'relative mx-auto mt-6 px-4 py-3 text-sm font-medium text-[var(--portal-text-muted)] underline-offset-4 hover:underline';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-splash-title"
      className="fixed inset-0 z-[110] flex flex-col overflow-y-auto bg-[var(--portal-bg)] text-[var(--portal-text)]"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 24px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[55%] opacity-60"
        style={{
          background:
            'radial-gradient(80% 60% at 50% 0%, color-mix(in srgb, var(--portal-text) 10%, transparent), transparent 70%)',
        }}
      />
      <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-192x192.png"
          alt=""
          width={96}
          height={96}
          className="size-24 rounded-[26px] border border-[var(--portal-border)] shadow-2xl"
        />
        <span className="mt-6 rounded-full border border-[var(--portal-border)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--portal-text-muted)]">
          Now on iPhone and Android
        </span>
        <h2
          id="app-splash-title"
          className="mt-4 text-[26px] font-semibold leading-tight tracking-tight"
        >
          Portal is better in the app
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--portal-text-muted)]">
          Your tasks, worklogs and chats in one tap, with notifications you can
          reply to right from your lock screen.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3">
          {order.map((store, i) => {
            const { mark: Mark, small, name } = STORES[store];
            const primary = i === 0;
            return (
              <a
                key={store}
                href={storeUrls[store]}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onDone}
                className={`flex h-14 w-full items-center justify-center gap-3 rounded-2xl border px-5 transition active:scale-[0.98] ${
                  primary
                    ? 'border-transparent bg-[var(--portal-text)] text-[var(--portal-bg)]'
                    : 'border-[var(--portal-border)] bg-[var(--portal-panel)] text-[var(--portal-text)]'
                }`}
              >
                <Mark />
                <span className="flex flex-col items-start leading-none">
                  <span className="text-[11px] font-medium opacity-75">
                    {small}
                  </span>
                  <span className="mt-1 text-[17px] font-semibold">{name}</span>
                </span>
              </a>
            );
          })}
        </div>
      </div>

      {continueHref ? (
        <a href={continueHref} onClick={onDone} className={continueClass}>
          Continue to website
        </a>
      ) : (
        <button type="button" onClick={onDone} className={continueClass}>
          Continue to website
        </button>
      )}
    </div>
  );
};

/** Remembers the visitor's pick, so the phone splash leaves them be. */
export const rememberAppSplashChoice = () =>
  write(SEEN_KEY, String(Date.now()));

/** Which store this device uses, or null on a computer. */
export const useStorePlatform = () => {
  const [platform, setPlatform] = useState<Platform | null>(null);
  useEffect(() => setPlatform(detectPlatform()), []);
  return platform;
};

export const AppDownloadSplash = ({ storeUrls }: { storeUrls: StoreUrls }) => {
  const pathname = usePathname() ?? '/';
  const [platform, setPlatform] = useState<Platform | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('inApp') === '1')
      write(IN_APP_KEY, '1');
    if (read(IN_APP_KEY) === '1') return;
    const seen = Number(read(SEEN_KEY) || 0);
    if (Date.now() - seen < REMEMBER_MS) return;
    setPlatform(detectPlatform());
  }, []);

  const open = !!platform && !skipPath(pathname);

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  if (!open || !platform) return null;

  return (
    <AppDownloadScreen
      storeUrls={storeUrls}
      platform={platform}
      onDone={() => {
        rememberAppSplashChoice();
        setPlatform(null);
      }}
    />
  );
};
