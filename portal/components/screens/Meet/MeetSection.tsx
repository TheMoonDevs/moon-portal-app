'use client';

import { type ReactNode, useState } from 'react';

import { cn } from '@/lib/utils';

import { Icon, Panel } from '../Admin/shared/AdminUI';

/**
 * A sidebar card on the Meet page whose header folds it away, so the
 * settings stay one tap away without crowding the calendar.
 */
export const MeetSection = ({
  icon,
  title,
  description,
  badge,
  defaultOpen = false,
  children,
  className,
}: {
  icon: string;
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Panel className={cn('overflow-hidden', className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[18px] text-neutral-300">
          <Icon name={icon} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
            {title}
            {badge}
          </span>
          {description && (
            <span className="block truncate text-xs text-neutral-500">
              {description}
            </span>
          )}
        </span>
        <Icon
          name="expand_more"
          className={cn(
            'text-[20px] text-neutral-500 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="border-t border-white/[0.07] p-4">{children}</div>
      )}
    </Panel>
  );
};
