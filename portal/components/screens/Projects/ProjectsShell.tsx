'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Toaster } from 'sonner';

import { PortalSdk } from '@/utils/services/PortalSdk';

import { Icon } from '../Admin/shared/AdminUI';
import { type NavData, ProjectsNav } from './ProjectsNav';

/* -------------------------------------------------------------------------- */
/*                      Sidebar data: small, cached, instant                  */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = 'portal:projects-nav:v1';
let cached: NavData | null = null;

const readStored = (): NavData | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NavData) : null;
  } catch {
    return null;
  }
};

const store = (data: NavData) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable */
  }
};

/* -------------------------------------------------------------------------- */
/*                                   Context                                  */
/* -------------------------------------------------------------------------- */

type ShellContext = {
  nav: NavData | null;
  /** Loads the sidebar again, after a project or company changes. */
  refreshNav: () => void;
  /** Where a project page puts its pages or plans menu, on the left. */
  slot: HTMLElement | null;
  /** A project page says it has a menu for the sidebar (Pages, Plans). */
  setNested: (label: string | null) => void;
  /** Opens the sidebar as a drawer, on phones. */
  openNav: () => void;
};

const Ctx = createContext<ShellContext>({
  nav: null,
  refreshNav: () => undefined,
  slot: null,
  setNested: () => undefined,
  openNav: () => undefined,
});

export const useProjectsShell = () => useContext(Ctx);

/** The menu button that opens the sidebar on phones. */
export const NavMenuButton = ({ className }: { className?: string }) => {
  const { openNav } = useProjectsShell();
  return (
    <button
      type="button"
      onClick={openNav}
      aria-label="Open projects menu"
      className={
        className ??
        'flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white md:hidden'
      }
    >
      <Icon name="menu" className="text-[20px]" />
    </button>
  );
};

/**
 * The projects area: one sidebar shared by Home and every project, so moving
 * between them only changes the right side. The sidebar loads a small list
 * (names, colours, nesting), kept from the last visit so it paints at once.
 * A project's Pages and Plans tabs swap in their own nested menu.
 */
export const ProjectsShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const [nav, setNav] = useState<NavData | null>(cached);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [mobileSlot, setMobileSlot] = useState<HTMLElement | null>(null);
  const [nested, setNested] = useState<string | null>(null);
  /** Showing every project while a nested menu is available. */
  const [showAll, setShowAll] = useState(false);
  const [drawer, setDrawer] = useState(false);

  const refreshNav = useCallback(() => {
    PortalSdk.getData('/api/projects/nav', null)
      .then((res) => {
        const data: NavData | null = res?.data ?? null;
        if (!data) return;
        cached = data;
        store(data);
        setNav(data);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!cached) {
      const stored = readStored();
      if (stored) setNav(stored);
    }
    refreshNav();
  }, [refreshNav]);

  // A new page or tab closes the drawer and brings its menu back.
  useEffect(() => {
    setDrawer(false);
    setShowAll(false);
  }, [pathname]);
  useEffect(() => setShowAll(false), [nested]);

  const sidebar = (inDrawer: boolean) => (
    <div className="flex h-full flex-col">
      <div
        className={
          nested && !showAll ? 'hidden' : 'flex min-h-0 flex-1 flex-col'
        }
      >
        <ProjectsNav
          data={nav}
          backTo={nested && showAll ? nested : null}
          onBack={() => setShowAll(false)}
        />
      </div>
      {/* A project's pages or plans, put here by the project page. */}
      <div
        className={
          nested && !showAll ? 'flex min-h-0 flex-1 flex-col' : 'hidden'
        }
      >
        {nested && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mx-3 mt-6 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-neutral-500 transition-colors hover:bg-white/[0.04] hover:text-neutral-200 md:mt-8"
          >
            <Icon name="arrow_back" className="text-[15px]" />
            All projects
          </button>
        )}
        <div
          ref={inDrawer ? setMobileSlot : setSlot}
          className="flex min-h-0 flex-1 flex-col"
        />
      </div>
    </div>
  );

  const value = useMemo<ShellContext>(
    () => ({
      nav,
      refreshNav,
      // The drawer's copy is used while it is open on phones.
      slot: drawer ? mobileSlot : slot,
      setNested,
      openNav: () => setDrawer(true),
    }),
    [nav, refreshNav, slot, mobileSlot, drawer],
  );

  return (
    <Ctx.Provider value={value}>
      <div className="fixed inset-0 flex bg-neutral-950 text-neutral-100 md:left-16">
        <aside className="hidden w-64 shrink-0 border-r border-white/[0.06] bg-neutral-950 md:block">
          {sidebar(false)}
        </aside>
        <div className="relative min-w-0 flex-1">{children}</div>
      </div>
      <AnimatePresence>
        {drawer && (
          <motion.div
            className="fixed inset-0 z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setDrawer(false)}
              className="absolute inset-0 bg-black/60"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 420, damping: 40 }}
              className="absolute inset-y-0 left-0 w-[280px] border-r border-white/[0.06] bg-neutral-950"
            >
              {sidebar(true)}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
      <Toaster theme="dark" position="bottom-right" richColors />
    </Ctx.Provider>
  );
};
