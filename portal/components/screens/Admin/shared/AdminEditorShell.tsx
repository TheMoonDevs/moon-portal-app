'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Icon } from './AdminUI';

export type EditorTab = {
  id: string;
  label: string;
  icon: string;
};

/**
 * Page frame shared by the admin editors: a sticky header carrying identity and
 * the primary action, an optional section tab bar, and a scrolling content
 * column. Keeping save in the header means it is reachable from every section.
 */
export const AdminEditorShell = ({
  backHref,
  backLabel = 'Admin console',
  title,
  description,
  media,
  meta,
  actions,
  tabs,
  activeTab,
  onTabChange,
  children,
}: {
  backHref: string;
  backLabel?: string;
  title: ReactNode;
  description?: ReactNode;
  media?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  tabs?: EditorTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  children: ReactNode;
}) => (
  <div className="flex h-dvh flex-col overflow-hidden bg-neutral-950 text-neutral-100">
    <header className="shrink-0 border-b border-white/[0.07] bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {media}
            <div className="min-w-0">
              <Link
                href={backHref}
                className="mb-1 inline-flex items-center gap-1 text-xs text-neutral-500 transition-colors hover:text-neutral-200"
              >
                <Icon name="arrow_back" className="text-[16px]" />
                {backLabel}
              </Link>
              <h1 className="truncate text-lg font-semibold tracking-tight text-white">
                {title}
              </h1>
              {description && (
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  {description}
                </p>
              )}
              {meta && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {meta}
                </div>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </div>

        {tabs && tabs.length > 0 && (
          <nav className="custom-scrollbar -mb-4 flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'border-white text-white'
                      : 'border-transparent text-neutral-500 hover:text-neutral-200',
                  )}
                >
                  <Icon name={tab.icon} className="text-[18px]" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </header>

    <main className="custom-scrollbar flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        {children}
      </div>
    </main>
  </div>
);
