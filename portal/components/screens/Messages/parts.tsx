'use client';

import {
  Icon,
  Spin,
  UserAvatar,
} from '@/components/screens/Admin/shared/AdminUI';
import { cn } from '@/lib/utils';

import type { ChatMessage } from './api';

export { Icon, Spin, UserAvatar };

/** Where a message of mine is: still on this device, failed, or with them. */
export type SendState = 'sending' | 'failed' | 'sent';

/**
 * WhatsApp-style ticks: a clock while sending, one grey tick when saved,
 * two grey when their device has it, two blue when they've seen it.
 */
export const Ticks = ({
  message,
  state = 'sent',
  className,
}: {
  message?: Pick<ChatMessage, 'deliveredAt' | 'readAt'> | null;
  state?: SendState;
  className?: string;
}) => {
  if (state === 'sending')
    return (
      <Icon
        name="schedule"
        className={cn('text-[14px] opacity-70', className)}
      />
    );
  if (state === 'failed')
    return (
      <Icon
        name="error"
        className={cn('text-[15px] text-rose-400', className)}
      />
    );
  if (message?.readAt)
    return (
      <Icon
        name="done_all"
        className={cn('text-[16px] text-sky-400', className)}
        aria-label="Read"
      />
    );
  if (message?.deliveredAt)
    return (
      <Icon
        name="done_all"
        className={cn('text-[16px] opacity-70', className)}
        aria-label="Delivered"
      />
    );
  return (
    <Icon
      name="done"
      className={cn('text-[16px] opacity-70', className)}
      aria-label="Sent"
    />
  );
};

const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g;

/** Text with clickable links, keeping line breaks. */
export const RichText = ({ text }: { text: string }) => {
  const parts = text.split(URL_PATTERN);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all underline underline-offset-2"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
};

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

/** A round icon button for headers and the composer. */
export const RoundButton = ({
  icon,
  label,
  onClick,
  className,
  disabled,
  active,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  active?: boolean;
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      'flex size-10 shrink-0 items-center justify-center rounded-full text-[22px] text-neutral-400 transition-colors hover:bg-white/[0.07] hover:text-neutral-100 disabled:opacity-40 auto-light:text-neutral-500 auto-light:hover:bg-black/[0.05] auto-light:hover:text-neutral-900',
      active &&
        'bg-white/[0.08] text-neutral-100 auto-light:bg-black/[0.06] auto-light:text-neutral-900',
      className,
    )}
  >
    <Icon name={icon} />
  </button>
);

/** Shared look for menus and dialogs that open over the chat. */
export const floatingPanel =
  'auto-theme z-[1300] overflow-hidden rounded-xl border border-white/10 bg-neutral-900 text-sm text-neutral-200 shadow-2xl shadow-black/50 auto-light:border-black/10 auto-light:bg-white auto-light:text-neutral-800 auto-light:shadow-black/10';

export const menuItem =
  'flex w-full cursor-pointer select-none items-center gap-3 px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-white/[0.06] focus:bg-white/[0.06] data-[highlighted]:bg-white/[0.06] auto-light:hover:bg-black/[0.04] auto-light:focus:bg-black/[0.04] auto-light:data-[highlighted]:bg-black/[0.04]';
