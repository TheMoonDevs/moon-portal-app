'use client';

import * as Menu from '@radix-ui/react-dropdown-menu';
import { memo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { CHAT_LIMITS } from '@/models/chat';

import { type ChatMessage, mediaUrl } from './api';
import { durationOf, sizeOf, timeOf } from './format';
import {
  floatingPanel,
  Icon,
  menuItem,
  QUICK_REACTIONS,
  RichText,
  type SendState,
  Spin,
  Ticks,
} from './parts';

export type BubbleAction =
  | 'reply'
  | 'copy'
  | 'forward'
  | 'edit'
  | 'info'
  | 'delete'
  | 'download'
  | 'retry'
  | 'cancel';

export interface BubbleProps {
  message: ChatMessage;
  mine: boolean;
  state: SendState;
  /** Upload progress, 0 to 1, while a file is sending. */
  progress?: number | null;
  /** A local link to the file while it uploads. */
  localUrl?: string | null;
  partnerName: string;
  /** "You", the other person, or a group member, by id. */
  nameOf?: (userId: string) => string;
  /** Groups: the sender's name, above the first message in a run. */
  senderName?: string | null;
  me: string | null;
  highlighted?: boolean;
  /** First message in a run from the same person: shows the bubble's tail. */
  first: boolean;
  onAction: (action: BubbleAction, message: ChatMessage) => void;
  onReact: (message: ChatMessage, emoji: string | null) => void;
  onOpenMedia: (message: ChatMessage) => void;
  onJumpTo: (messageId: string) => void;
}

const isPending = (m: ChatMessage) => m.id.startsWith('pending:');

const SENDER_COLORS = [
  'text-emerald-300 auto-light:text-emerald-700',
  'text-sky-300 auto-light:text-sky-700',
  'text-amber-300 auto-light:text-amber-700',
  'text-fuchsia-300 auto-light:text-fuchsia-700',
  'text-rose-300 auto-light:text-rose-700',
  'text-violet-300 auto-light:text-violet-700',
  'text-teal-300 auto-light:text-teal-700',
  'text-orange-300 auto-light:text-orange-700',
];

/** Each group member keeps one name color. */
const senderColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
};

/** One message, WhatsApp style, with its menu. */
export const MessageBubble = memo(function MessageBubble({
  message: m,
  mine,
  state,
  progress,
  localUrl,
  partnerName,
  nameOf,
  senderName,
  me,
  highlighted,
  first,
  onAction,
  onReact,
  onOpenMedia,
  onJumpTo,
}: BubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout>>();
  const pending = isPending(m);
  const deleted = !!m.deletedAt;
  const age = Date.now() - new Date(m.createdAt).getTime();
  const canEdit =
    mine &&
    !pending &&
    !deleted &&
    age < CHAT_LIMITS.editWindowMs &&
    (m.kind === 'text' || !!m.attachment);
  const canDeleteForAll =
    mine && !pending && !deleted && age < CHAT_LIMITS.deleteWindowMs;
  const hasMedia = !!m.attachment && !m.attachment.expiredAt;
  const isVisual = m.kind === 'image' || m.kind === 'video';
  const myReaction = m.reactions.find((r) => r.userId === me)?.emoji ?? null;

  // Long-press opens the menu on touch screens.
  const startPress = () => {
    if (pending || deleted) return;
    pressTimer.current = setTimeout(() => setMenuOpen(true), 450);
  };
  const endPress = () => clearTimeout(pressTimer.current);

  const reactions = groupReactions(m.reactions);
  const who = (id: string) =>
    nameOf ? nameOf(id) : id === me ? 'You' : partnerName;

  return (
    <div
      id={`msg-${m.id}`}
      className={cn(
        'group flex px-3 md:px-[6%]',
        mine ? 'justify-end' : 'justify-start',
        first ? 'mt-2' : 'mt-0.5',
        reactions.length && 'mb-3',
      )}
    >
      <div
        className={cn(
          'relative max-w-[85%] rounded-xl shadow-sm transition-colors md:max-w-[65%]',
          mine
            ? 'bg-emerald-800 text-white auto-light:bg-emerald-100 auto-light:text-neutral-900'
            : 'bg-neutral-800 text-neutral-100 auto-light:bg-white auto-light:text-neutral-900',
          first && (mine ? 'rounded-tr-sm' : 'rounded-tl-sm'),
          highlighted && 'ring-2 ring-amber-300/70',
          isVisual && hasMedia ? 'p-1' : 'px-2.5 py-1.5',
        )}
        onTouchStart={startPress}
        onTouchEnd={endPress}
        onTouchMove={endPress}
        onContextMenu={(e) => {
          if (pending || deleted) return;
          e.preventDefault();
          setMenuOpen(true);
        }}
      >
        {!pending && !deleted && (
          <Menu.Root open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
            <Menu.Trigger asChild>
              <button
                type="button"
                aria-label="Message options"
                className={cn(
                  'absolute right-1 top-1 z-[1] flex size-6 items-center justify-center rounded-full bg-black/30 text-[18px] text-white opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 auto-light:bg-white/80 auto-light:text-neutral-700',
                  menuOpen && 'opacity-100',
                )}
              >
                <Icon name="expand_more" />
              </button>
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Content
                align={mine ? 'end' : 'start'}
                sideOffset={4}
                collisionPadding={8}
                className={cn(floatingPanel, 'w-56 py-1')}
              >
                <div className="flex justify-between px-2 pb-1 pt-0.5">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      aria-label={`React ${emoji}`}
                      onClick={() => {
                        onReact(m, myReaction === emoji ? null : emoji);
                        setMenuOpen(false);
                      }}
                      className={cn(
                        'flex size-8 items-center justify-center rounded-full text-lg transition-transform hover:scale-125',
                        myReaction === emoji &&
                          'bg-white/10 auto-light:bg-black/[0.07]',
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <Menu.Separator className="my-1 h-px bg-white/10 auto-light:bg-black/10" />
                <Item
                  icon="reply"
                  label="Reply"
                  onSelect={() => onAction('reply', m)}
                />
                {!!m.text && (
                  <Item
                    icon="content_copy"
                    label="Copy"
                    onSelect={() => onAction('copy', m)}
                  />
                )}
                {(!!m.text || hasMedia) && (
                  <Item
                    icon="forward"
                    label="Forward"
                    onSelect={() => onAction('forward', m)}
                  />
                )}
                {hasMedia && (
                  <Item
                    icon="download"
                    label="Download"
                    onSelect={() => onAction('download', m)}
                  />
                )}
                {canEdit && (
                  <Item
                    icon="edit"
                    label="Edit"
                    onSelect={() => onAction('edit', m)}
                  />
                )}
                {mine && (
                  <Item
                    icon="info"
                    label="Message info"
                    onSelect={() => onAction('info', m)}
                  />
                )}
                <Item
                  icon="delete"
                  label={canDeleteForAll ? 'Delete…' : 'Delete for me'}
                  danger
                  onSelect={() => onAction('delete', m)}
                />
              </Menu.Content>
            </Menu.Portal>
          </Menu.Root>
        )}

        {senderName && (
          <p
            className={cn(
              'truncate text-xs font-semibold',
              senderColor(m.senderId),
              isVisual && hasMedia && 'px-1.5 pt-0.5',
            )}
          >
            {senderName}
          </p>
        )}

        {m.forwarded && !deleted && (
          <p
            className={cn(
              'flex items-center gap-1 text-xs italic opacity-60',
              isVisual && hasMedia && 'px-1.5 pt-0.5',
            )}
          >
            <Icon name="forward" className="text-[14px]" /> Forwarded
          </p>
        )}

        {m.replyTo && !deleted && (
          <button
            type="button"
            onClick={() => onJumpTo(m.replyTo!.id)}
            className={cn(
              'mb-1 flex w-full flex-col overflow-hidden rounded-md border-l-4 border-sky-400 bg-black/20 px-2 py-1 text-left text-xs auto-light:bg-black/[0.05]',
              isVisual && hasMedia && 'mb-1',
            )}
          >
            <span className="font-semibold text-sky-300 auto-light:text-sky-700">
              {who(m.replyTo.senderId)}
            </span>
            <span className="line-clamp-2 opacity-80">
              {m.replyTo.text || 'Message'}
            </span>
          </button>
        )}

        {deleted ? (
          <p className="flex items-center gap-1.5 pr-12 text-sm italic opacity-60">
            <Icon name="block" className="text-[16px]" />
            {mine ? 'You deleted this message' : 'This message was deleted'}
          </p>
        ) : (
          <>
            {m.attachment && (
              <Attachment
                message={m}
                localUrl={localUrl}
                progress={progress}
                pending={pending}
                state={state}
                onOpen={() => onOpenMedia(m)}
                onCancel={() => onAction('cancel', m)}
                onRetry={() => onAction('retry', m)}
              />
            )}
            {!!m.text && (
              <p
                className={cn(
                  'whitespace-pre-wrap break-words text-[15px] leading-snug',
                  isVisual && hasMedia && 'px-1.5 pt-1',
                )}
              >
                <RichText text={m.text} />
                {/* Room for the time and ticks on the last line. */}
                <span
                  className={cn('inline-block', mine ? 'w-[74px]' : 'w-12')}
                />
              </p>
            )}
          </>
        )}

        <span
          className={cn(
            'float-right -mb-0.5 ml-2 flex items-center gap-0.5 text-[11px] leading-none opacity-70',
            !m.text && isVisual && hasMedia && !deleted
              ? 'absolute bottom-2 right-2.5 rounded-full bg-black/40 px-1.5 py-1 text-white opacity-100'
              : m.text && !deleted
                ? '-mt-4'
                : 'mt-1',
          )}
        >
          {m.editedAt && !deleted && (
            <span className="mr-1 italic">edited</span>
          )}
          {timeOf(m.createdAt)}
          {mine && !deleted && (
            <Ticks message={m} state={state} className="ml-0.5" />
          )}
        </span>

        {state === 'failed' && !m.attachment && (
          <button
            type="button"
            onClick={() => onAction('retry', m)}
            className="mt-1 block text-xs font-medium text-rose-300 underline auto-light:text-rose-600"
          >
            Not sent. Tap to retry
          </button>
        )}

        {reactions.length > 0 && (
          <span
            className={cn(
              'absolute -bottom-3.5 flex items-center gap-0.5 rounded-full border border-neutral-900 bg-neutral-700 px-1.5 py-0.5 text-xs shadow auto-light:border-white auto-light:bg-neutral-100',
              mine ? 'right-2' : 'left-2',
            )}
            title={m.reactions
              .map((r) => `${who(r.userId)} ${r.emoji}`)
              .join(', ')}
          >
            {reactions.map(([emoji]) => (
              <span key={emoji}>{emoji}</span>
            ))}
            {m.reactions.length > 1 && (
              <span className="ml-0.5 opacity-70">{m.reactions.length}</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
});

const Item = ({
  icon,
  label,
  danger,
  onSelect,
}: {
  icon: string;
  label: string;
  danger?: boolean;
  onSelect: () => void;
}) => (
  <Menu.Item
    onSelect={onSelect}
    className={cn(menuItem, danger && 'text-rose-300 auto-light:text-rose-600')}
  >
    <Icon name={icon} className="text-[18px] opacity-80" />
    {label}
  </Menu.Item>
);

const groupReactions = (reactions: ChatMessage['reactions']) => {
  const counts = new Map<string, number>();
  for (const r of reactions)
    counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
  return Array.from(counts.entries());
};

const Attachment = ({
  message: m,
  localUrl,
  progress,
  pending,
  state,
  onOpen,
  onCancel,
  onRetry,
}: {
  message: ChatMessage;
  localUrl?: string | null;
  progress?: number | null;
  pending: boolean;
  state: SendState;
  onOpen: () => void;
  onCancel: () => void;
  onRetry: () => void;
}) => {
  const a = m.attachment!;
  if (a.expiredAt)
    return (
      <p className="flex items-center gap-2 pr-12 text-sm italic opacity-70">
        <Icon name="hide_image" className="text-[18px]" />
        {m.kind === 'image'
          ? 'Photo'
          : m.kind === 'video'
            ? 'Video'
            : a.name}{' '}
        removed after 90 days
      </p>
    );

  const overlay = pending && (
    <span className="absolute inset-0 flex items-center justify-center bg-black/40">
      {state === 'failed' ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRetry();
          }}
          className="flex items-center gap-1 rounded-full bg-black/70 px-3 py-1.5 text-sm text-white"
        >
          <Icon name="refresh" className="text-[18px]" /> Retry
        </button>
      ) : (
        <button
          type="button"
          aria-label="Cancel upload"
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className="relative flex size-12 items-center justify-center rounded-full bg-black/60 text-white"
        >
          <ProgressRing value={progress ?? 0} />
          <Icon name="close" className="relative text-[22px]" />
        </button>
      )}
    </span>
  );

  if (m.kind === 'image' || m.kind === 'video') {
    const ratio = a.width && a.height ? a.width / a.height : 4 / 3;
    const width = Math.min(300, Math.max(180, ratio >= 1 ? 300 : 300 * ratio));
    const src =
      localUrl ??
      (pending
        ? null
        : mediaUrl(m.id, { thumb: !!a.thumbKey || m.kind === 'image' }));
    return (
      <button
        type="button"
        onClick={pending ? undefined : onOpen}
        className="relative block overflow-hidden rounded-lg bg-black/30"
        style={{
          width,
          aspectRatio: String(Math.max(0.6, Math.min(ratio, 1.9))),
        }}
        aria-label={m.kind === 'image' ? 'Open photo' : 'Play video'}
      >
        {src && m.kind === 'image' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={a.name}
            loading="lazy"
            className="size-full object-cover"
          />
        )}
        {m.kind === 'video' &&
          (localUrl ? (
            <video
              src={localUrl}
              muted
              playsInline
              className="size-full object-cover"
            />
          ) : a.thumbKey ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl(m.id, { thumb: true })}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-neutral-500">
              <Icon name="movie" className="text-[40px]" />
            </span>
          ))}
        {m.kind === 'video' && !pending && (
          <>
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-black/55 text-[30px] text-white">
                <Icon name="play_arrow" filled />
              </span>
            </span>
            <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[11px] text-white">
              <Icon name="videocam" className="text-[14px]" />
              {durationOf(a.duration) || sizeOf(a.size)}
            </span>
          </>
        )}
        {overlay}
      </button>
    );
  }

  return (
    <div className="mb-1 flex min-w-[220px] items-center gap-3 rounded-lg bg-black/20 p-2 pr-3 auto-light:bg-black/[0.05]">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[24px] auto-light:bg-black/[0.07]">
        {pending && state !== 'failed' ? (
          <Spin />
        ) : (
          <Icon name={fileIcon(a.mime)} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{a.name}</span>
        <span className="block text-xs opacity-60">
          {sizeOf(a.size)}
          {pending &&
            state !== 'failed' &&
            progress != null &&
            ` · ${Math.round(progress * 100)}%`}
        </span>
      </span>
      {pending ? (
        state === 'failed' ? (
          <button
            type="button"
            onClick={onRetry}
            aria-label="Retry"
            className="text-[22px]"
          >
            <Icon name="refresh" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="text-[22px]"
          >
            <Icon name="close" />
          </button>
        )
      ) : (
        <a
          href={mediaUrl(m.id, { download: true })}
          aria-label={`Download ${a.name}`}
          className="flex size-8 items-center justify-center rounded-full text-[22px] hover:bg-white/10 auto-light:hover:bg-black/[0.06]"
        >
          <Icon name="download" />
        </a>
      )}
    </div>
  );
};

const fileIcon = (mime: string) => {
  if (mime === 'application/pdf') return 'picture_as_pdf';
  if (mime.startsWith('audio/')) return 'audio_file';
  if (mime.includes('zip') || mime.includes('compressed')) return 'folder_zip';
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv'))
    return 'table';
  if (mime.startsWith('video/')) return 'movie';
  return 'description';
};

const ProgressRing = ({ value }: { value: number }) => {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg
      className="absolute inset-0 -rotate-90"
      viewBox="0 0 48 48"
      aria-hidden
    >
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.25}
        strokeWidth="3"
      />
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, Math.max(0.03, value)))}
        strokeLinecap="round"
        className="transition-[stroke-dashoffset]"
      />
    </svg>
  );
};
