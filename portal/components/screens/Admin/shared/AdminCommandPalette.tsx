'use client';

import type { User } from '@db/client';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { APP_ROUTES } from '@/utils/constants/appInfo';

import type { AdminTabId } from './adminNav';
import { ADMIN_TABS } from './adminNav';
import { Icon, UserAvatar } from './AdminUI';

type Command = {
  id: string;
  label: string;
  hint?: string;
  icon: string;
  group: string;
  avatar?: string | null;
  run: () => void;
};

export const AdminCommandPalette = ({
  open,
  onOpenChange,
  users,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
  onNavigate: (tab: AdminTabId) => void;
}) => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Command[]>(() => {
    const navCommands: Command[] = ADMIN_TABS.map((tab) => ({
      id: `tab-${tab.id}`,
      label: tab.title,
      hint: tab.description,
      icon: tab.icon,
      group: 'Go to',
      run: () => onNavigate(tab.id),
    }));

    const actionCommands: Command[] = [
      {
        id: 'action-new-user',
        label: 'Create a new user',
        icon: 'person_add',
        group: 'Actions',
        run: () => router.push(APP_ROUTES.userEditor),
      },
      {
        id: 'action-new-badge',
        label: 'Create a new badge',
        icon: 'add_circle',
        group: 'Actions',
        run: () => router.push(APP_ROUTES.badgeEditor),
      },
      {
        id: 'action-home',
        label: 'Back to the portal',
        icon: 'home',
        group: 'Actions',
        run: () => router.push(APP_ROUTES.home),
      },
    ];

    const userCommands: Command[] = users.map((user) => ({
      id: `user-${user.id}`,
      label: user.name || user.username,
      hint: `${user.userType} · @${user.username}`,
      icon: 'person',
      avatar: user.avatar,
      group: 'Users',
      run: () => router.push(`${APP_ROUTES.userEditor}?id=${user.id}`),
    }));

    return [...navCommands, ...actionCommands, ...userCommands];
  }, [onNavigate, router, users]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = term
      ? commands.filter((command) =>
          `${command.label} ${command.hint ?? ''}`.toLowerCase().includes(term),
        )
      : commands.filter((command) => command.group !== 'Users');
    return filtered.slice(0, 40);
  }, [commands, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    const active = listRef.current?.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, results]);

  const runCommand = (command?: Command) => {
    if (!command) return;
    onOpenChange(false);
    command.run();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % Math.max(results.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(
        (index) =>
          (index - 1 + Math.max(results.length, 1)) %
          Math.max(results.length, 1),
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runCommand(results[activeIndex]);
    }
  };

  let lastGroup = '';

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onKeyDown={handleKeyDown}
          className="fixed left-1/2 top-[12vh] z-[71] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl shadow-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Title className="sr-only">
            Admin command palette
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search sections, actions and users
          </DialogPrimitive.Description>

          <div className="flex items-center gap-3 border-b border-white/[0.07] px-4">
            <Icon name="search" className="text-[20px] text-neutral-500" />
            {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search sections, actions or users…"
              className="h-14 flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
            />
            <kbd className="hidden rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-neutral-500 sm:block">
              ESC
            </kbd>
          </div>

          <div
            ref={listRef}
            className="custom-scrollbar max-h-[55vh] overflow-y-auto p-2"
          >
            {results.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-neutral-500">
                No results for “{query}”
              </p>
            )}
            {results.map((command, index) => {
              const showGroup = command.group !== lastGroup;
              lastGroup = command.group;
              return (
                <div key={command.id}>
                  {showGroup && (
                    <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                      {command.group}
                    </p>
                  )}
                  <button
                    type="button"
                    data-active={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => runCommand(command)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                      index === activeIndex
                        ? 'bg-white/[0.08]'
                        : 'hover:bg-white/[0.04]',
                    )}
                  >
                    {command.group === 'Users' ? (
                      <UserAvatar
                        src={command.avatar}
                        name={command.label}
                        size={24}
                      />
                    ) : (
                      <Icon
                        name={command.icon}
                        className="text-[20px] text-neutral-400"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-neutral-100">
                        {command.label}
                      </span>
                      {command.hint && (
                        <span className="block truncate text-xs text-neutral-500">
                          {command.hint}
                        </span>
                      )}
                    </span>
                    {index === activeIndex && (
                      <Icon
                        name="keyboard_return"
                        className="text-[16px] text-neutral-500"
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
