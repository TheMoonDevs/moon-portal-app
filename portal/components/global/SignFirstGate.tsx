'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { PortalSdk } from '@/utils/services/PortalSdk';

/*
 * Documents someone has to sign before using the Portal (a required policy,
 * a rollout that asks for it): until they do, the Portal opens on them.
 * A nudge in the browser, not a lock; the documents themselves are the
 * record. Pages that signing needs, or that come before signing in, stay
 * open.
 */

type Blocking = {
  ref: string;
  title: string;
  companyName: string;
  signUrl: string;
};

const OPEN_PATHS = [
  '/app',
  '/sign',
  '/join',
  '/login',
  '/logout',
  '/oauth',
  '/apply',
  '/policies',
  '/privacy',
  '/terms',
  '/delete-account',
  '/support',
  '/~offline',
];

const RECHECK_MS = 60_000;

export const SignFirstGate = () => {
  const pathname = usePathname() ?? '/';
  const [docs, setDocs] = useState<Blocking[]>([]);
  const checked = useRef(0);
  const open = OPEN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  useEffect(() => {
    if (open) return;
    // Once a minute at most, and again after coming back from signing.
    if (Date.now() - checked.current < RECHECK_MS && !docs.length) return;
    checked.current = Date.now();
    PortalSdk.getData('/api/me/documents/required', null)
      .then((res) => setDocs(res?.data?.documents ?? []))
      .catch(() => setDocs([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, open]);

  if (open || !docs.length) return null;
  const [first, ...rest] = docs;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sign-first-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-6 text-neutral-100 shadow-2xl">
        <span className="flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
          <span className="material-symbols-outlined text-[24px] leading-none">
            signature
          </span>
        </span>
        <h2 id="sign-first-title" className="mt-4 text-lg font-semibold">
          Sign this first
        </h2>
        <p className="mt-1 text-sm text-neutral-400">
          {first.companyName} asks you to sign{' '}
          <span className="font-medium text-neutral-100">{first.title}</span>{' '}
          before using the Portal. It takes a minute.
        </p>
        {rest.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 text-xs text-neutral-500">
            {rest.map((d) => (
              <li key={d.ref}>
                Then: {d.title} · {d.companyName}
              </li>
            ))}
          </ul>
        )}
        <a
          href={first.signUrl}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-neutral-950 hover:bg-neutral-200"
        >
          Read and sign
          <span className="material-symbols-outlined text-[18px]">
            arrow_forward
          </span>
        </a>
        <a
          href="/logout"
          className="mt-3 block text-center text-xs text-neutral-500 hover:text-neutral-300"
        >
          Sign out
        </a>
      </div>
    </div>
  );
};
