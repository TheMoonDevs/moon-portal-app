'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast, Toaster } from 'sonner';

import { cn } from '@/lib/utils';
import type { ChatEvent } from '@/models/chat';

import {
  chatApi,
  type ChatConversation,
  type ChatMessage,
  type ChatPerson,
} from './api';
import { useChat, useChatEvents } from './ChatProvider';
import { ChatThread } from './ChatThread';
import { ConversationList } from './ConversationList';
import { NewGroupPanel } from './GroupPanels';
import { NewChatPanel } from './NewChatPanel';
import { Icon, Spin } from './parts';

const LIST_POLL_MS = 15_000;

/**
 * Messages: the chats list and the open chat, side by side on wide screens
 * and one at a time on phones. `/messages/<chatId>` opens a chat;
 * `/messages?to=<userId>` starts one with someone, and
 * `/messages?project=<projectId>` opens (or starts) a project's group.
 */
export const MessagesPage = ({
  conversationId,
}: {
  conversationId: string | null;
}) => {
  const router = useRouter();
  const params = useSearchParams();
  const { me, live, partnerTyping, refreshUnread } = useChat();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState<ChatConversation | null>(null);
  const [newChat, setNewChat] = useState<false | 'chat' | 'group'>(false);
  const [jumpTo, setJumpTo] = useState<string | null>(params?.get('m') ?? null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(
    () =>
      chatApi<{ conversations: ChatConversation[] }>('/api/chat/conversations')
        .then((res) => setConversations(res.conversations))
        .catch((e: Error) => toast.error(e.message))
        .finally(() => setLoading(false)),
    [],
  );

  const reloadSoon = useCallback(() => {
    clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(load, 500);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (live) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, LIST_POLL_MS);
    return () => clearInterval(timer);
  }, [live, load]);

  const active = useMemo(
    () =>
      conversations.find((c) => c.id === conversationId) ??
      (opened?.id === conversationId ? opened : null),
    [conversations, conversationId, opened],
  );

  // A chat that isn't in the list yet (new, or no messages): load it directly.
  useEffect(() => {
    if (!conversationId || loading || active) return;
    chatApi<{ conversation: ChatConversation }>(
      `/api/chat/conversations/${conversationId}`,
    )
      .then((res) => setOpened(res.conversation))
      .catch((e: Error) => {
        toast.error(e.message);
        router.replace('/messages');
      });
  }, [conversationId, loading, active, router]);

  const openChatWith = useCallback(
    async (person: ChatPerson) => {
      const existing = conversations.find((c) => c.partner.id === person.id);
      if (existing) return existing;
      const res = await chatApi<{ conversation: ChatConversation }>(
        '/api/chat/conversations',
        'POST',
        { userId: person.id },
      );
      setOpened(res.conversation);
      return res.conversation;
    },
    [conversations],
  );

  // `?project=<projectId>`: the project page's group chat shortcut.
  const projectId = params?.get('project');
  useEffect(() => {
    if (!projectId || loading) return;
    chatApi<{ conversation: ChatConversation }>('/api/chat/projects', 'POST', {
      projectId,
    })
      .then((res) => {
        setOpened(res.conversation);
        router.replace(`/messages/${res.conversation.id}`);
      })
      .catch((e: Error) => {
        toast.error(e.message);
        router.replace('/messages');
      });
  }, [projectId, loading, router]);

  // `?to=<userId>`: start a chat from someone's profile.
  const to = params?.get('to');
  useEffect(() => {
    if (!to || loading) return;
    openChatWith({ id: to, name: null })
      .then((room) => router.replace(`/messages/${room.id}`))
      .catch((e: Error) => {
        toast.error(e.message);
        router.replace('/messages');
      });
  }, [to, loading, openChatWith, router]);

  const open = (room: ChatConversation, messageId: string | null = null) => {
    setNewChat(false);
    setJumpTo(messageId);
    router.push(`/messages/${room.id}`);
  };

  const onChanged = useCallback((room: ChatConversation) => {
    setOpened((current) => (current?.id === room.id ? room : current));
    setConversations((list) => {
      const has = list.some((c) => c.id === room.id);
      if (!has) return room.lastMessage ? [room, ...list] : list;
      // A direct chat keeps the partner it was listed with; a group's name
      // and photo may have changed.
      return list.map((c) =>
        c.id === room.id
          ? {
              ...c,
              ...room,
              partner: room.kind === 'direct' ? c.partner : room.partner,
            }
          : c,
      );
    });
  }, []);

  useChatEvents((event: ChatEvent) => {
    if (event.type === 'conversation') {
      reloadSoon();
      return;
    }
    setConversations((list) => {
      const room = list.find((c) => c.id === event.conversationId);
      if (!room) {
        // A chat we don't have yet (someone wrote first).
        if (event.type === 'message') reloadSoon();
        return list;
      }
      if (event.type === 'message') {
        const fromThem = event.message.senderId !== me;
        const isOpen =
          event.conversationId === conversationId &&
          document.visibilityState === 'visible';
        return list.map((c) =>
          c.id === room.id
            ? {
                ...c,
                lastMessage: event.message,
                lastMessageAt: event.message.createdAt,
                unread: fromThem && !isOpen ? c.unread + 1 : c.unread,
              }
            : c,
        );
      }
      if (event.type === 'update' && room.lastMessage?.id === event.message.id)
        return list.map((c) =>
          c.id === room.id ? { ...c, lastMessage: event.message } : c,
        );
      if (
        event.type === 'receipt' &&
        room.lastMessage &&
        room.lastMessage.senderId === me &&
        room.lastMessage.createdAt <= event.upTo
      ) {
        const last = room.lastMessage;
        const next =
          event.status === 'read'
            ? {
                ...last,
                readAt: last.readAt ?? event.at,
                deliveredAt: last.deliveredAt ?? event.at,
              }
            : { ...last, deliveredAt: last.deliveredAt ?? event.at };
        return list.map((c) =>
          c.id === room.id ? { ...c, lastMessage: next } : c,
        );
      }
      return list;
    });
  });

  const searchMessages = useCallback(
    (q: string) =>
      chatApi<{ messages: ChatMessage[] }>(
        `/api/chat/search?q=${encodeURIComponent(q)}`,
      ).then((res) => res.messages),
    [],
  );

  useEffect(() => {
    refreshUnread();
  }, [conversations, refreshUnread]);

  const showThread = !!conversationId;

  return (
    <div className="auto-theme fixed inset-0 flex bg-neutral-950 text-neutral-100 auto-light:bg-neutral-100 auto-light:text-neutral-900 md:left-16">
      <Toaster position="top-center" richColors theme="system" />
      <aside
        className={cn(
          'h-full min-h-0 w-full flex-col border-r border-white/[0.06] auto-light:border-black/[0.06] md:flex md:w-[360px] lg:w-[400px]',
          showThread ? 'hidden' : 'flex',
        )}
      >
        {newChat === 'group' ? (
          <NewGroupPanel
            onBack={() => setNewChat('chat')}
            onCreated={(room) => {
              setOpened(room);
              setConversations((list) => [
                room,
                ...list.filter((c) => c.id !== room.id),
              ]);
              open(room);
            }}
          />
        ) : newChat ? (
          <NewChatPanel
            onBack={() => setNewChat(false)}
            onNewGroup={() => setNewChat('group')}
            onPick={async (person) => {
              try {
                open(await openChatWith(person));
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          />
        ) : (
          <ConversationList
            me={me}
            conversations={conversations}
            loading={loading}
            activeId={conversationId}
            typingIn={partnerTyping ? conversationId : null}
            onOpen={(c) => open(c)}
            onNewChat={() => setNewChat('chat')}
            onOpenSearchResult={(m) => {
              const room = conversations.find((c) => c.id === m.conversationId);
              if (room) open(room, m.id);
            }}
            searchMessages={searchMessages}
          />
        )}
      </aside>

      <main
        className={cn(
          'h-full min-h-0 min-w-0 flex-1',
          showThread ? 'flex flex-col' : 'hidden md:flex md:flex-col',
        )}
      >
        {showThread && active ? (
          <ChatThread
            key={active.id}
            conversation={active}
            conversations={conversations}
            me={me}
            jumpTo={jumpTo}
            onBack={() => router.push('/messages')}
            onChanged={onChanged}
            openChatWith={openChatWith}
            onLeft={() => {
              setConversations((list) =>
                list.filter((c) => c.id !== active.id),
              );
              setOpened(null);
              router.push('/messages');
            }}
          />
        ) : showThread ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-neutral-500">
            <Spin /> Opening chat…
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#0c0f0e] px-8 text-center auto-light:bg-[#efeae2]">
            <span className="flex size-20 items-center justify-center rounded-full bg-white/[0.05] text-[40px] text-neutral-500 auto-light:bg-black/[0.05]">
              <Icon name="forum" />
            </span>
            <h2 className="text-xl font-semibold">Portal Messages</h2>
            <p className="max-w-sm text-sm text-neutral-400 auto-light:text-neutral-600">
              Chat with anyone who works in a company with you, start groups,
              and talk with your project's team in its project group. Send
              photos, videos and files, and see when your messages are delivered
              and read.
            </p>
            <p className="flex items-center gap-1 text-xs text-neutral-500">
              <Icon name="lock" className="text-[14px]" /> Only the people in a
              chat can see it.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};
