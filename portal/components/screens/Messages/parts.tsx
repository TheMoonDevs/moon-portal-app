'use client';

import {
  Icon,
  Spin,
  UserAvatar,
} from '@/components/screens/Admin/shared/AdminUI';
import { cn } from '@/lib/utils';

import type { ChatConversation, ChatMessage } from './api';

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

/**
 * A chat's picture: the person's photo, a group's photo (or a group icon),
 * or a project group's logo with a small folder badge, so project groups
 * stand out in every list.
 */
export const ChatAvatar = ({
  conversation: c,
  size = 48,
}: {
  conversation: Pick<ChatConversation, 'kind' | 'partner'>;
  size?: number;
}) => {
  if (c.kind === 'direct')
    return (
      <UserAvatar src={c.partner.avatar} name={c.partner.name} size={size} />
    );
  const badge = Math.max(16, Math.round(size * 0.4));
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      {c.partner.avatar ? (
        <UserAvatar src={c.partner.avatar} name={c.partner.name} size={size} />
      ) : (
        <span
          style={{ width: size, height: size, fontSize: size * 0.5 }}
          className={cn(
            'flex items-center justify-center rounded-full border border-white/10',
            c.kind === 'project'
              ? 'bg-sky-500/15 text-sky-300 auto-light:bg-sky-100 auto-light:text-sky-700'
              : 'bg-neutral-700 text-neutral-300 auto-light:bg-neutral-300 auto-light:text-neutral-600',
          )}
        >
          <Icon name={c.kind === 'project' ? 'folder' : 'group'} filled />
        </span>
      )}
      {c.kind === 'project' && (
        <span
          title="Project group"
          style={{ width: badge, height: badge, fontSize: badge * 0.62 }}
          className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-sky-500 text-white ring-2 ring-neutral-950 auto-light:ring-neutral-100"
        >
          <Icon name="folder" filled />
        </span>
      )}
    </span>
  );
};

/** A small "Project" tag shown next to a project group's name. */
export const ProjectTag = ({ className }: { className?: string }) => (
  <span
    className={cn(
      'inline-flex shrink-0 items-center gap-0.5 rounded bg-sky-500/15 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-sky-300 auto-light:bg-sky-100 auto-light:text-sky-700',
      className,
    )}
  >
    <Icon name="folder" filled className="text-[11px]" /> Project
  </span>
);
