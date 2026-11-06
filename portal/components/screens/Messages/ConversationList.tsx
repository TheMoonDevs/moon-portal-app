'use client';

import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

import type { ChatConversation, ChatMessage } from './api';
import { listTimeOf, previewOf, systemTextOf } from './format';
import {
  ChatAvatar,
  Icon,
  ProjectTag,
  RoundButton,
  Spin,
  Ticks,
} from './parts';

type Filter = 'all' | 'unread' | 'groups' | 'archived';

/** A sender's first name, for "Asha: see you at 5" in group rows. */
const firstName = (name?: string | null) => (name || 'Someone').split(' ')[0];

const senderName = (c: ChatConversation, id: string) =>
  c.group?.members.find((p) => p.id === id)?.name ?? c.partner.name;

/** The chats list: search, filters, and one row per chat. */
export const ConversationList = ({
  me,
  conversations,
  loading,
  activeId,
  typingIn,
  onOpen,
  onNewChat,
  onOpenSearchResult,
  searchMessages,
}: {
  me: string | null;
  conversations: ChatConversation[];
  loading: boolean;
  activeId: string | null;
  /** The chat whose partner is typing right now, if any. */
  typingIn: string | null;
  onOpen: (conversation: ChatConversation) => void;
  onNewChat: () => void;
  onOpenSearchResult: (message: ChatMessage) => void;
  searchMessages: (q: string) => Promise<ChatMessage[]>;
}) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<ChatMessage[]>([]);
  const [searching, setSearching] = useState(false);

  const q = query.trim().toLowerCase();

  useEffect(() => {
    if (q.length < 2) {
      setFound([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      searchMessages(q)
        .then(setFound)
        .catch(() => setFound([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [q, searchMessages]);

  const archivedCount = conversations.filter((c) => c.archived).length;
  const hasGroups = conversations.some((c) => c.kind !== 'direct');

  const shown = useMemo(() => {
    const list = conversations.filter((c) => {
      if (q) return (c.partner.name || '').toLowerCase().includes(q);
      if (filter === 'archived') return c.archived;
      if (c.archived) return false;
      if (filter === 'unread') return c.unread > 0;
      if (filter === 'groups') return c.kind !== 'direct';
      return true;
    });
    return list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (b.lastMessageAt || '').localeCompare(a.lastMessageAt || '');
    });
  }, [conversations, filter, q]);

  const byId = useMemo(
    () => new Map(conversations.map((c) => [c.id, c])),
    [conversations],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h1 className="text-xl font-semibold tracking-tight">Messages</h1>
        <RoundButton icon="edit_square" label="New chat" onClick={onNewChat} />
      </div>

      <div className="px-3">
        <label className="flex h-10 items-center gap-2 rounded-full bg-white/[0.06] px-3 text-sm text-neutral-400 focus-within:ring-1 focus-within:ring-white/20 auto-light:bg-black/[0.05] auto-light:text-neutral-500 auto-light:focus-within:ring-black/15">
          <Icon name="search" className="text-[20px]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats and messages"
            className="min-w-0 flex-1 bg-transparent text-neutral-100 outline-none placeholder:text-neutral-500 auto-light:text-neutral-900"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="text-[18px]"
            >
              <Icon name="close" />
            </button>
          )}
        </label>
      </div>

      {!q && (
        <div className="flex gap-2 p-3">
          {(
            [
              ['all', 'All'],
              ['unread', 'Unread'],
              ...(hasGroups ? [['groups', 'Groups']] : []),
              ...(archivedCount
                ? [['archived', `Archived (${archivedCount})`]]
                : []),
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                filter === key
                  ? 'bg-emerald-500/15 text-emerald-300 auto-light:bg-emerald-600/10 auto-light:text-emerald-700'
                  : 'bg-white/[0.06] text-neutral-400 hover:text-neutral-100 auto-light:bg-black/[0.05] auto-light:text-neutral-600 auto-light:hover:text-neutral-900',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="quiet-scrollbar min-h-0 flex-1 overflow-y-auto pb-24 md:pb-4">
        {loading && !conversations.length ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500">
            <Spin /> Loading chats…
          </div>
        ) : (
          <>
            {shown.map((c) => (
              <ConversationRow
                key={c.id}
                me={me}
                conversation={c}
                active={c.id === activeId}
                typing={typingIn === c.id}
                onClick={() => onOpen(c)}
              />
            ))}
            {!shown.length && !q && (
              <EmptyList filter={filter} onNewChat={onNewChat} />
            )}
            {q && !shown.length && !found.length && !searching && (
              <p className="px-6 py-10 text-center text-sm text-neutral-500">
                No chats or messages match “{query.trim()}”.
              </p>
            )}
            {q.length >= 2 && (found.length > 0 || searching) && (
              <div className="pt-2">
                <p className="px-4 pb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Messages {searching && <Spin className="ml-1 size-3" />}
                </p>
                {found.map((m) => {
                  const room = byId.get(m.conversationId);
                  if (!room) return null;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onOpenSearchResult(m)}
                      className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-white/[0.04] auto-light:hover:bg-black/[0.03]"
                    >
                      <span className="flex justify-between text-xs text-neutral-500">
                        <span className="truncate">
                          {m.senderId === me
                            ? 'You'
                            : senderName(room, m.senderId)}{' '}
                          · {room.partner.name}
                        </span>
                        <span>{listTimeOf(m.createdAt)}</span>
                      </span>
                      <span className="line-clamp-2 text-sm">
                        {previewOf(m)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const EmptyList = ({
  filter,
  onNewChat,
}: {
  filter: Filter;
  onNewChat: () => void;
}) => (
  <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
    <span className="flex size-14 items-center justify-center rounded-full bg-white/[0.06] text-[28px] text-neutral-400 auto-light:bg-black/[0.05]">
      <Icon name="forum" />
    </span>
    <p className="text-sm text-neutral-400 auto-light:text-neutral-600">
      {filter === 'unread'
        ? 'No unread messages.'
        : filter === 'archived'
          ? 'No archived chats.'
          : filter === 'groups'
            ? 'No groups yet.'
            : 'Message anyone who works in a company with you.'}
    </p>
    {filter === 'all' && (
      <button
        type="button"
        onClick={onNewChat}
        className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-emerald-400"
      >
        Start a chat
      </button>
    )}
  </div>
);

const ConversationRow = ({
  me,
  conversation: c,
  active,
  typing,
  onClick,
}: {
  me: string | null;
  conversation: ChatConversation;
  active: boolean;
  typing: boolean;
  onClick: () => void;
}) => {
  const last = c.lastMessage;
  const mine = !!last && last.senderId === me;
  const system = last?.kind === 'system';
  // In groups, say who wrote the last message.
  const from =
    c.kind !== 'direct' && last && !system && !last.deletedAt
      ? mine
        ? 'You'
        : firstName(senderName(c, last.senderId))
      : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
        active
          ? 'bg-white/[0.08] auto-light:bg-black/[0.06]'
          : 'hover:bg-white/[0.04] auto-light:hover:bg-black/[0.03]',
      )}
    >
      <ChatAvatar conversation={c} size={48} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 border-b border-white/[0.05] pb-2.5 auto-light:border-black/[0.05]">
        <span className="flex items-baseline justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-medium">{c.partner.name}</span>
            {c.kind === 'project' && <ProjectTag />}
          </span>
          <span
            className={cn(
              'shrink-0 text-xs',
              c.unread
                ? 'font-medium text-emerald-400 auto-light:text-emerald-600'
                : 'text-neutral-500',
            )}
          >
            {listTimeOf(c.lastMessageAt)}
          </span>
        </span>
        <span className="flex items-center gap-1 text-sm text-neutral-400 auto-light:text-neutral-600">
          {typing ? (
            <span className="truncate text-emerald-400 auto-light:text-emerald-600">
              typing…
            </span>
          ) : (
            <>
              {mine && !last.deletedAt && !system && (
                <Ticks message={last} className="shrink-0" />
              )}
              {last?.deletedAt && (
                <Icon name="block" className="shrink-0 text-[15px]" />
              )}
              <span className={cn('truncate', last?.deletedAt && 'italic')}>
                {from && <span>{from}: </span>}
                {last
                  ? system
                    ? systemTextOf(last, me)
                    : previewOf(last)
                  : 'No messages'}
              </span>
            </>
          )}
          <span className="ml-auto flex shrink-0 items-center gap-1 pl-1">
            {c.muted && (
              <Icon
                name="notifications_off"
                className="text-[16px] text-neutral-500"
              />
            )}
            {c.pinned && (
              <Icon name="keep" className="text-[16px] text-neutral-500" />
            )}
            {c.unread > 0 && (
              <span
                className={cn(
                  'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-neutral-950',
                  c.muted ? 'bg-neutral-500' : 'bg-emerald-500',
                )}
              >
                {c.unread > 99 ? '99+' : c.unread}
              </span>
            )}
          </span>
        </span>
      </span>
    </button>
  );
};
