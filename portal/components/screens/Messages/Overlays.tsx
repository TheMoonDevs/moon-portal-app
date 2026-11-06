'use client';

import * as Dialog from '@radix-ui/react-dialog';
import dayjs from 'dayjs';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { CHAT_LIMITS } from '@/models/chat';

import {
  chatApi,
  type ChatConversation,
  type ChatMessage,
  type ChatPerson,
  mediaUrl,
} from './api';
import { durationOf, sizeOf } from './format';
import { isImage, isPlayableVideo } from './media';
import { useContacts } from './NewChatPanel';
import { Icon, RoundButton, Spin, Ticks, UserAvatar } from './parts';

/* -------------------------------------------------------------------------- */
/*                                Small dialog                                */
/* -------------------------------------------------------------------------- */

export const Sheet = ({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) => (
  <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[1300] bg-black/60" />
      <Dialog.Content
        className={cn(
          'auto-theme fixed left-1/2 top-1/2 z-[1301] flex max-h-[85dvh] w-[min(420px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 text-neutral-100 shadow-2xl auto-light:border-black/10 auto-light:bg-white auto-light:text-neutral-900',
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3 auto-light:border-black/[0.07]">
          <Dialog.Title className="text-base font-semibold">
            {title}
          </Dialog.Title>
          <Dialog.Close
            className="text-[22px] text-neutral-400"
            aria-label="Close"
          >
            <Icon name="close" />
          </Dialog.Close>
        </div>
        <Dialog.Description className="sr-only">{title}</Dialog.Description>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

/* -------------------------------------------------------------------------- */
/*                                   Delete                                   */
/* -------------------------------------------------------------------------- */

export const DeleteDialog = ({
  message,
  mine,
  onClose,
  onDelete,
}: {
  message: ChatMessage | null;
  mine: boolean;
  onClose: () => void;
  onDelete: (scope: 'me' | 'everyone') => void;
}) => {
  const forAll =
    !!message &&
    mine &&
    Date.now() - new Date(message.createdAt).getTime() <
      CHAT_LIMITS.deleteWindowMs;
  return (
    <Sheet open={!!message} onClose={onClose} title="Delete message?">
      <div className="flex flex-col gap-1 p-3">
        {forAll && (
          <button
            type="button"
            onClick={() => onDelete('everyone')}
            className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-300 hover:bg-white/[0.05] auto-light:text-rose-600 auto-light:hover:bg-black/[0.04]"
          >
            Delete for everyone
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete('me')}
          className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-300 hover:bg-white/[0.05] auto-light:text-rose-600 auto-light:hover:bg-black/[0.04]"
        >
          Delete for me
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2.5 text-left text-sm hover:bg-white/[0.05] auto-light:hover:bg-black/[0.04]"
        >
          Cancel
        </button>
      </div>
    </Sheet>
  );
};

/* -------------------------------------------------------------------------- */
/*                                Message info                                */
/* -------------------------------------------------------------------------- */

const stamp = (value?: string | null) =>
  value ? dayjs(value).format('D MMM YYYY, HH:mm') : '—';

export const InfoDialog = ({
  message,
  group = false,
  onClose,
}: {
  message: ChatMessage | null;
  /** In a group, ticks mean everyone; show how many have read it. */
  group?: boolean;
  onClose: () => void;
}) => (
  <Sheet open={!!message} onClose={onClose} title="Message info">
    {message && (
      <div className="flex flex-col gap-4 p-4 text-sm">
        {group && message.recipientCount ? (
          <Row
            icon={<Icon name="visibility" />}
            label="Seen by"
            value={`${message.readCount ?? 0} of ${message.recipientCount}`}
          />
        ) : null}
        <Row
          icon={<Ticks message={{ readAt: 'x' }} />}
          label={group ? 'Read by everyone' : 'Read'}
          value={stamp(message.readAt)}
        />
        <Row
          icon={<Ticks message={{ deliveredAt: 'x', readAt: null }} />}
          label={group ? 'Delivered to everyone' : 'Delivered'}
          value={stamp(message.deliveredAt)}
        />
        <Row
          icon={<Ticks message={{ deliveredAt: null, readAt: null }} />}
          label="Sent"
          value={stamp(message.createdAt)}
        />
        {message.editedAt && (
          <Row
            icon={<Icon name="edit" />}
            label="Edited"
            value={stamp(message.editedAt)}
          />
        )}
      </div>
    )}
  </Sheet>
);

const Row = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-3">
    <span className="flex w-6 justify-center text-[18px]">{icon}</span>
    <span className="flex-1 font-medium">{label}</span>
    <span className="text-neutral-400 auto-light:text-neutral-600">
      {value}
    </span>
  </div>
);

/* -------------------------------------------------------------------------- */
/*                                  Forward                                   */
/* -------------------------------------------------------------------------- */

export const ForwardDialog = ({
  message,
  conversations,
  onClose,
  onForward,
}: {
  message: ChatMessage | null;
  conversations: ChatConversation[];
  onClose: () => void;
  /** Called with the chosen people; the screen opens chats as needed. */
  onForward: (people: ChatPerson[]) => Promise<void>;
}) => {
  const { contacts } = useContacts();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Map<string, ChatPerson>>(new Map());
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (message) {
      setPicked(new Map());
      setQuery('');
    }
  }, [message]);

  // Recent chats first, then everyone else.
  const people = useMemo(() => {
    const recent = conversations.map((c) => c.partner);
    const seen = new Set(recent.map((p) => p.id));
    const all = [...recent, ...(contacts ?? []).filter((p) => !seen.has(p.id))];
    const q = query.trim().toLowerCase();
    return q
      ? all.filter((p) => (p.name || '').toLowerCase().includes(q))
      : all;
  }, [conversations, contacts, query]);

  const toggle = (p: ChatPerson) =>
    setPicked((current) => {
      const next = new Map(current);
      if (next.has(p.id)) next.delete(p.id);
      else if (next.size < 5) next.set(p.id, p);
      return next;
    });

  return (
    <Sheet open={!!message} onClose={onClose} title="Forward message to">
      <div className="px-3 pt-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="h-10 w-full rounded-full bg-white/[0.06] px-4 text-sm outline-none auto-light:bg-black/[0.05]"
        />
      </div>
      <div className="quiet-scrollbar min-h-0 flex-1 overflow-y-auto py-2">
        {people.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p)}
            className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-white/[0.04] auto-light:hover:bg-black/[0.03]"
          >
            <UserAvatar src={p.avatar} name={p.name} size={40} />
            <span className="flex-1 truncate">{p.name}</span>
            <span
              className={cn(
                'flex size-5 items-center justify-center rounded border text-[16px]',
                picked.has(p.id)
                  ? 'border-emerald-500 bg-emerald-500 text-neutral-950'
                  : 'border-neutral-600',
              )}
            >
              {picked.has(p.id) && <Icon name="check" />}
            </span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-3 auto-light:border-black/[0.07]">
        <span className="truncate text-sm text-neutral-400">
          {picked.size
            ? Array.from(picked.values())
                .map((p) => p.name)
                .join(', ')
            : 'Pick up to 5 people'}
        </span>
        <button
          type="button"
          disabled={!picked.size || sending}
          onClick={async () => {
            setSending(true);
            try {
              await onForward(Array.from(picked.values()));
            } finally {
              setSending(false);
            }
          }}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[22px] text-neutral-950 disabled:opacity-40"
          aria-label="Forward"
        >
          {sending ? <Spin /> : <Icon name="send" filled />}
        </button>
      </div>
    </Sheet>
  );
};

/* -------------------------------------------------------------------------- */
/*                       Photos and videos about to send                      */
/* -------------------------------------------------------------------------- */

export const StagedFiles = ({
  files,
  partnerName,
  onClose,
  onSend,
}: {
  files: File[];
  partnerName: string;
  onClose: () => void;
  onSend: (files: File[], caption: string) => void;
}) => {
  const [index, setIndex] = useState(0);
  const [caption, setCaption] = useState('');
  const [list, setList] = useState(files);
  const urls = useMemo(
    () =>
      list.map((f) =>
        isImage(f.type) || isPlayableVideo(f.type)
          ? URL.createObjectURL(f)
          : null,
      ),
    [list],
  );
  useEffect(
    () => () => urls.forEach((u) => u && URL.revokeObjectURL(u)),
    [urls],
  );
  useEffect(() => {
    setList(files);
    setIndex(0);
    setCaption('');
  }, [files]);

  if (!list.length) return null;
  const current = list[Math.min(index, list.length - 1)];
  const url = urls[Math.min(index, list.length - 1)];
  const tooBig = list.filter(
    (f) =>
      f.size >
      (isImage(f.type)
        ? CHAT_LIMITS.maxImageBytes * 3
        : CHAT_LIMITS.maxFileBytes),
  );

  return (
    <div className="auto-theme absolute inset-0 z-30 flex flex-col bg-neutral-950 text-neutral-100 auto-light:bg-neutral-100 auto-light:text-neutral-900">
      <div className="flex items-center gap-2 p-2">
        <RoundButton icon="close" label="Cancel" onClick={onClose} />
        <span className="truncate text-sm text-neutral-400">
          Send to {partnerName}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        {url && isImage(current.type) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={current.name}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        )}
        {url && isPlayableVideo(current.type) && (
          <video
            src={url}
            controls
            className="max-h-full max-w-full rounded-lg"
          />
        )}
        {!url && (
          <div className="flex flex-col items-center gap-3 text-center">
            <Icon name="description" className="text-[64px] text-neutral-500" />
            <p className="font-medium">{current.name}</p>
            <p className="text-sm text-neutral-500">{sizeOf(current.size)}</p>
          </div>
        )}
      </div>
      {tooBig.length > 0 && (
        <p className="px-4 pb-2 text-center text-sm text-rose-400">
          {tooBig.map((f) => f.name).join(', ')}{' '}
          {tooBig.length === 1 ? 'is' : 'are'} over 100 MB and can&apos;t be
          sent.
        </p>
      )}
      <div className="flex gap-2 overflow-x-auto px-4 pb-2">
        {list.map((f, i) => (
          <div key={`${f.name}-${i}`} className="relative">
            <button
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                'flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 bg-white/[0.06]',
                i === index ? 'border-emerald-500' : 'border-transparent',
              )}
            >
              {urls[i] && isImage(f.type) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[i]!} alt="" className="size-full object-cover" />
              ) : (
                <Icon
                  name={isPlayableVideo(f.type) ? 'movie' : 'description'}
                  className="text-[24px]"
                />
              )}
            </button>
            {list.length > 1 && (
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => {
                  setList((l) => l.filter((_, j) => j !== i));
                  setIndex(0);
                }}
                className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-neutral-700 text-[14px] text-white"
              >
                <Icon name="close" />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <input
          autoFocus
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !tooBig.length)
              onSend(list, caption.trim());
          }}
          placeholder="Add a caption"
          className="h-11 min-w-0 flex-1 rounded-full bg-white/[0.07] px-4 text-[15px] outline-none auto-light:bg-white"
        />
        <button
          type="button"
          aria-label="Send"
          disabled={!!tooBig.length}
          onClick={() => onSend(list, caption.trim())}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[22px] text-neutral-950 disabled:opacity-40"
        >
          <Icon name="send" filled />
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                Media viewer                                */
/* -------------------------------------------------------------------------- */

export const MediaViewer = ({
  items,
  start,
  title,
  onClose,
}: {
  items: ChatMessage[];
  start: string | null;
  title: (m: ChatMessage) => string;
  onClose: () => void;
}) => {
  const [id, setId] = useState(start);
  useEffect(() => setId(start), [start]);
  const index = items.findIndex((m) => m.id === id);
  const current = index >= 0 ? items[index] : null;

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) setId(items[index - 1].id);
      if (e.key === 'ArrowRight' && index < items.length - 1)
        setId(items[index + 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, index, items, onClose]);

  if (!current) return null;
  return (
    <div className="fixed inset-0 z-[1400] flex flex-col bg-black/95 text-white">
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex size-10 items-center justify-center text-[24px]"
        >
          <Icon name="arrow_back" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{title(current)}</p>
          <p className="text-xs text-white/60">
            {dayjs(current.createdAt).format('D MMM YYYY, HH:mm')}
          </p>
        </div>
        <a
          href={mediaUrl(current.id, { download: true })}
          aria-label="Download"
          className="flex size-10 items-center justify-center text-[24px]"
        >
          <Icon name="download" />
        </a>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4">
        {index > 0 && (
          <button
            type="button"
            aria-label="Previous"
            onClick={() => setId(items[index - 1].id)}
            className="absolute left-2 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-[26px] hover:bg-white/20"
          >
            <Icon name="chevron_left" />
          </button>
        )}
        {current.kind === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.id}
            src={mediaUrl(current.id)}
            alt={current.attachment?.name}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <video
            key={current.id}
            src={mediaUrl(current.id)}
            poster={
              current.attachment?.thumbKey
                ? mediaUrl(current.id, { thumb: true })
                : undefined
            }
            controls
            autoPlay
            playsInline
            className="max-h-full max-w-full"
          />
        )}
        {index < items.length - 1 && (
          <button
            type="button"
            aria-label="Next"
            onClick={() => setId(items[index + 1].id)}
            className="absolute right-2 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-[26px] hover:bg-white/20"
          >
            <Icon name="chevron_right" />
          </button>
        )}
      </div>
      {current.text && (
        <p className="px-4 pb-6 text-center text-sm">{current.text}</p>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                         Media, links and docs panel                        */
/* -------------------------------------------------------------------------- */

export const MediaGallery = ({
  open,
  conversationId,
  onClose,
  onOpenMedia,
}: {
  open: boolean;
  conversationId: string;
  onClose: () => void;
  onOpenMedia: (message: ChatMessage, all: ChatMessage[]) => void;
}) => {
  const [tab, setTab] = useState<'media' | 'docs'>('media');
  const [items, setItems] = useState<ChatMessage[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setItems(null);
    chatApi<{ messages: ChatMessage[] }>(
      `/api/chat/conversations/${conversationId}/messages?media=1&limit=100`,
    )
      .then((res) => setItems(res.messages))
      .catch(() => setItems([]));
  }, [open, conversationId]);

  const media = (items ?? []).filter(
    (m) => m.kind === 'image' || m.kind === 'video',
  );
  const docs = (items ?? []).filter((m) => m.kind === 'file');

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Media and files"
      className="h-[80dvh]"
    >
      <div className="flex gap-2 px-4 pt-3">
        {(['media', 'docs'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium',
              tab === key
                ? 'bg-emerald-500/15 text-emerald-300 auto-light:text-emerald-700'
                : 'bg-white/[0.06] text-neutral-400 auto-light:bg-black/[0.05]',
            )}
          >
            {key === 'media'
              ? `Photos and videos (${media.length})`
              : `Files (${docs.length})`}
          </button>
        ))}
      </div>
      <div className="quiet-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
        {!items && (
          <div className="flex justify-center py-10">
            <Spin />
          </div>
        )}
        {items && tab === 'media' && (
          <div className="grid grid-cols-3 gap-1">
            {media.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={!!m.attachment?.expiredAt}
                onClick={() =>
                  onOpenMedia(
                    m,
                    media.filter((x) => !x.attachment?.expiredAt),
                  )
                }
                className="relative aspect-square overflow-hidden rounded bg-white/[0.06]"
              >
                {m.attachment?.expiredAt ? (
                  <span className="flex size-full items-center justify-center text-[24px] text-neutral-500">
                    <Icon name="hide_image" />
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(m.id, { thumb: true })}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                )}
                {m.kind === 'video' && (
                  <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-black/60 px-1 text-[10px] text-white">
                    <Icon name="play_arrow" className="text-[12px]" />
                    {durationOf(m.attachment?.duration)}
                  </span>
                )}
              </button>
            ))}
            {!media.length && (
              <p className="col-span-3 py-10 text-center text-sm text-neutral-500">
                No photos or videos yet.
              </p>
            )}
          </div>
        )}
        {items && tab === 'docs' && (
          <div className="flex flex-col gap-1">
            {docs.map((m) => (
              <a
                key={m.id}
                href={
                  m.attachment?.expiredAt
                    ? undefined
                    : mediaUrl(m.id, { download: true })
                }
                className="flex items-center gap-3 rounded-lg p-2 hover:bg-white/[0.04] auto-light:hover:bg-black/[0.03]"
              >
                <Icon
                  name="description"
                  className="text-[28px] text-neutral-400"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {m.attachment?.name}
                  </span>
                  <span className="block text-xs text-neutral-500">
                    {m.attachment?.expiredAt
                      ? 'Removed after 90 days'
                      : `${sizeOf(m.attachment?.size ?? 0)} · ${dayjs(m.createdAt).format('D MMM YYYY')}`}
                  </span>
                </span>
              </a>
            ))}
            {!docs.length && (
              <p className="py-10 text-center text-sm text-neutral-500">
                No files yet.
              </p>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
};
