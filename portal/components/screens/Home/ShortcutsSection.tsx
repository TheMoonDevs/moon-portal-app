import Link from 'next/link';

import { APP_ROUTES } from '@/utils/constants/appInfo';

/**
 * Quick links to tools that don't need a tab of their own. The row has room
 * for four; add new shortcuts here.
 */
const SHORTCUTS = [
  { label: 'Meet', icon: 'calendar_month', href: APP_ROUTES.meet },
];

export const ShortcutsSection = () => (
  <nav aria-label="Shortcuts" className="mx-2 mt-4 grid grid-cols-4 gap-2">
    {SHORTCUTS.map((shortcut) => (
      <Link
        key={shortcut.href}
        href={shortcut.href}
        className="group flex flex-col items-center gap-1.5 rounded-[1.15em] bg-white px-2 py-3 transition-colors hover:bg-neutral-100"
      >
        <span className="flex size-11 items-center justify-center rounded-2xl bg-neutral-900 text-white transition-transform group-hover:scale-105">
          <span className="material-symbols-outlined text-[22px]">
            {shortcut.icon}
          </span>
        </span>
        <span className="text-xs font-semibold text-neutral-800">
          {shortcut.label}
        </span>
      </Link>
    ))}
  </nav>
);
