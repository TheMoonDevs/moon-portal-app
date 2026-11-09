import Link from 'next/link';

import { APP_ROUTES } from '@/utils/constants/appInfo';

/**
 * Quick links to tools that don't need a tab of their own: flat black icons
 * on small white tiles that grow to fit their label. Add new shortcuts here.
 */
const SHORTCUTS = [
  // Looking back over the person's days and work: their User page.
  { label: 'Past', icon: 'history', href: APP_ROUTES.user },
  { label: 'Meet', icon: 'calendar_month', href: APP_ROUTES.meet },
  { label: 'Chat', icon: 'chat_bubble', href: APP_ROUTES.messages },
  { label: 'Goals', icon: 'flag', href: APP_ROUTES.goals },
  // Tasks are logged as worklogs, so this opens the person's worklogs.
  { label: 'Tasks', icon: 'task_alt', href: APP_ROUTES.userWorklogs },
  // What they signed, what waits for their signature, their saved signature.
  { label: 'Docs', icon: 'description', href: APP_ROUTES.myDocuments },
];

export const ShortcutsSection = () => (
  <nav aria-label="Shortcuts" className="mx-2 mt-4 flex flex-wrap gap-2">
    {SHORTCUTS.map((shortcut) => (
      <Link
        key={shortcut.href}
        href={shortcut.href}
        className="group flex min-w-16 flex-col items-center gap-0.5 rounded-xl bg-white px-2.5 py-2 text-neutral-900 transition-colors hover:bg-neutral-100"
      >
        <span className="material-symbols-outlined text-[26px] leading-none transition-transform group-hover:scale-110">
          {shortcut.icon}
        </span>
        <span className="text-[11px] font-semibold text-neutral-800">
          {shortcut.label}
        </span>
      </Link>
    ))}
  </nav>
);
