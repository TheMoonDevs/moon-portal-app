'use client';

import type { Event } from '@db/client';
import Link from 'next/link';

import { cn } from '@/lib/utils';

import { Icon, IconAction, Pill } from '../shared/AdminUI';

const formatTime = (time?: string) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours)) return time;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes || 0).padStart(2, '0')} ${period}`;
};

export const EventCard = ({
  event,
  isPast,
  onEdit,
  onDelete,
}: {
  event: Event;
  isPast: boolean;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
}) => {
  const date = new Date(event.date);

  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-white/[0.02]">
      <div
        className={cn(
          'flex size-12 shrink-0 flex-col items-center justify-center rounded-xl border',
          isPast
            ? 'border-white/[0.05] bg-white/[0.02] text-neutral-500'
            : 'border-white/[0.09] bg-white/[0.05] text-neutral-100',
        )}
      >
        <span className="text-[10px] uppercase tracking-wide opacity-70">
          {date.toLocaleDateString(undefined, { month: 'short' })}
        </span>
        <span className="text-base font-semibold leading-none">
          {date.getDate()}
        </span>
      </div>

      <div className="min-w-[180px] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-neutral-100">
            {event.name}
          </p>
          {isPast ? <Pill>Past</Pill> : <Pill tone="positive">Upcoming</Pill>}
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500">
          {event.subTitle}
        </p>
      </div>

      <div className="hidden w-28 shrink-0 items-center gap-1.5 text-xs text-neutral-400 sm:flex">
        <Icon name="schedule" className="text-[16px]" />
        {formatTime(event.time)}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {event.link && (
          <Link
            href={event.link}
            target="_blank"
            rel="noreferrer"
            title="Open event link"
            className="flex size-8 items-center justify-center rounded-lg text-[18px] text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon name="open_in_new" />
          </Link>
        )}
        <IconAction
          icon="edit"
          label="Edit event"
          onClick={() => onEdit(event)}
        />
        <IconAction
          icon="delete"
          label="Delete event"
          tone="danger"
          onClick={() => onDelete(event)}
        />
      </div>
    </li>
  );
};
