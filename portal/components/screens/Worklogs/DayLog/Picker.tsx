'use client';

import * as Popover from '@radix-ui/react-popover';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import { Icon } from '../../Admin/shared/AdminUI';

/*
 * A small list to pick from with the keyboard: type to narrow it down (any
 * letters of the words, in order), arrows to move, Enter to pick, Escape to
 * close. Used for where a point goes and which point a sub-log belongs to.
 */

export type PickerOption = {
  id: string;
  label: string;
  /** Shown under or beside the label, and searched too. */
  hint?: string;
  group?: string;
  /** A coloured dot in front. */
  color?: string | null;
  icon?: string;
};

/**
 * How well an option matches: 2 when every typed word is in it, 1 when the
 * letters come in order within one word (e.g. "lv" for "lyricvideo"), 0
 * when it does not match.
 */
const matchScore = (option: PickerOption, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return 2;
  const hay =
    `${option.label} ${option.hint ?? ''} ${option.group ?? ''}`.toLowerCase();
  if (q.split(/\s+/).every((w) => hay.includes(w))) return 2;
  // Initials: "lv" for "Lyric video".
  const initials = option.label
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('');
  if (!q.includes(' ') && initials.includes(q)) return 1;
  return 0;
};

/** The list itself, for showing inside another popover or panel. */
export const PickerList = ({
  options,
  onPick,
  placeholder = 'Type to find…',
  empty = 'Nothing matches',
  autoFocus = true,
}: {
  options: PickerOption[];
  onPick: (option: PickerOption) => void;
  placeholder?: string;
  empty?: string;
  autoFocus?: boolean;
}) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const shown = useMemo(() => {
    const scored = options.map((o) => ({ o, score: matchScore(o, query) }));
    // Initials only count when nothing has the words themselves.
    const best = Math.max(0, ...scored.map((x) => x.score));
    return scored
      .filter((x) => x.score > 0 && x.score === best)
      .map((x) => x.o);
  }, [options, query]);
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActive((i) => Math.min(shown.length - 1, i + 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActive((i) => Math.max(0, i - 1));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (shown[active]) onPick(shown[active]);
        }
      }}
    >
      <div className="flex items-center gap-2 border-b border-white/[0.07] px-3">
        <Icon name="search" className="text-[16px] text-neutral-500" />
        <input
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="h-10 flex-1 bg-transparent text-sm placeholder:text-neutral-600 focus:outline-none"
        />
      </div>
      <div
        ref={listRef}
        role="listbox"
        className="custom-scrollbar max-h-72 overflow-y-auto p-1"
      >
        {shown.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-neutral-500">
            {empty}
          </p>
        )}
        {shown.map((option, i) => {
          const header =
            option.group && option.group !== shown[i - 1]?.group
              ? option.group
              : null;
          return (
            <div key={`${option.group ?? ''}-${option.id}`}>
              {header && (
                <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  {header}
                </p>
              )}
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                data-index={i}
                onMouseEnter={() => setActive(i)}
                onClick={() => onPick(option)}
                className={cn(
                  'flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm',
                  i === active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]',
                )}
              >
                {option.icon ? (
                  <Icon
                    name={option.icon}
                    className="mt-0.5 text-[15px] text-neutral-400"
                  />
                ) : (
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: option.color || '#737373' }}
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{option.label}</span>
                  {option.hint && (
                    <span className="block truncate text-[11px] text-neutral-500">
                      {option.hint}
                    </span>
                  )}
                </span>
              </button>
            </div>
          );
        })}
      </div>
      <p className="border-t border-white/[0.07] px-3 py-1.5 text-[10px] text-neutral-600">
        Type to filter · ↑↓ to move · Enter to pick · Esc to close
      </p>
    </div>
  );
};

export const Picker = ({
  trigger,
  options,
  onPick,
  placeholder,
  empty,
  align = 'start',
}: {
  trigger: ReactNode;
  options: PickerOption[];
  onPick: (option: PickerOption) => void;
  placeholder?: string;
  empty?: string;
  align?: 'start' | 'end';
}) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={6}
          collisionPadding={12}
          className="z-[1300] w-[min(340px,calc(100vw-24px))] overflow-hidden rounded-xl border border-white/10 bg-neutral-900 text-neutral-100 shadow-2xl shadow-black/50"
        >
          {open && (
            <PickerList
              options={options}
              placeholder={placeholder}
              empty={empty}
              onPick={(o) => {
                setOpen(false);
                onPick(o);
              }}
            />
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
