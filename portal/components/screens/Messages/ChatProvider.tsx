'use client';

import type * as AblyTypes from 'ably';
import { useSession } from 'next-auth/react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { ChatEvent } from '@/models/chat';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';

import { chatApi } from './api';

/*
 * Keeps the portal in touch with chats on every page: the unread badge,
 * delivery ticks for new messages, and (on the Messages screen) typing and
 * online status for the open chat. Live updates come through Ably; when it
 * isn't set up the screens poll instead (`live` is false).
 */

type Listener = (event: ChatEvent) => void;

interface OpenChat {
  conversationId: string;
  /** The other person in a direct chat; null in a group. */
  partnerId: string | null;
}

interface ChatContextValue {
  me: string | null;
  /** Ably is connected: no need to poll. */
  live: boolean;
  unread: number;
  refreshUnread: () => void;
  /** Hear every inbox event (new messages, ticks, edits). */
  subscribe: (listener: Listener) => () => void;
  /** The chat on screen, for typing and online status. */
  setOpenChat: (chat: OpenChat | null) => void;
  partnerOnline: boolean;
  partnerTyping: boolean;
  /** Who is typing in the open chat (in a group, the latest to type). */
  typingUserId: string | null;
  /** Call as the person types; sent at most every few seconds. */
  notifyTyping: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

const INBOX_EVENT = 'chat';
const TYPING_EVENT = 'typing';
const TYPING_SEND_EVERY = 2500;
const TYPING_SHOWN_FOR = 4500;

const post = (url: string, body: unknown = {}, keepalive = false) =>
  fetch(url, {
    method: 'POST',
    keepalive,
    headers: {
      'Content-Type': 'application/json',
      tmd_portal_api_key: TMD_PORTAL_API_KEY,
    },
    body: JSON.stringify(body),
  }).catch(() => undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const me =
    status === 'authenticated'
      ? ((session?.user as { id?: string } | undefined)?.id ?? null)
      : null;

  const [live, setLive] = useState(false);
  const [unread, setUnread] = useState(0);
  const [openChat, setOpenChatState] = useState<OpenChat | null>(null);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const partnerTyping = !!typingUserId;

  const listeners = useRef(new Set<Listener>());
  const ablyRef = useRef<AblyTypes.Realtime | null>(null);
  const openChatRef = useRef<OpenChat | null>(null);
  const lastTypingSent = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const unreadTimer = useRef<ReturnType<typeof setTimeout>>();
  const deliveredTimer = useRef<ReturnType<typeof setTimeout>>();

  const refreshUnread = useCallback(() => {
    clearTimeout(unreadTimer.current);
    unreadTimer.current = setTimeout(() => {
      chatApi<{ unread: number }>('/api/chat/summary')
        .then((res) => setUnread(res.unread))
        .catch(() => undefined);
    }, 400);
  }, []);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const emit = useCallback((event: ChatEvent) => {
    listeners.current.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[chat] listener failed', error);
      }
    });
  }, []);

  /* ---------------------------- inbox and badge --------------------------- */

  useEffect(() => {
    if (!me) return;
    refreshUnread();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshUnread();
      // Keeps "last seen" right when the person leaves.
      else post('/api/chat/seen', {}, true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [me, refreshUnread]);

  // Without Ably, check the badge now and then.
  useEffect(() => {
    if (!me || live) return;
    const timer = setInterval(refreshUnread, 30_000);
    return () => clearInterval(timer);
  }, [me, live, refreshUnread]);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    let client: AblyTypes.Realtime | null = null;

    (async () => {
      // Is Ably set up on this server? If not, stay on polling.
      const probe = await chatApi<{ enabled: boolean }>(
        '/api/chat/realtime-token',
      ).catch(() => ({ enabled: false }));
      if (cancelled || !probe.enabled) return;
      const Ably = await import('ably');
      if (cancelled) return;
      client = new Ably.Realtime({
        clientId: me,
        echoMessages: false,
        authCallback: (_params, callback) => {
          const chat = openChatRef.current;
          chatApi<{
            enabled: boolean;
            tokenRequest: AblyTypes.TokenRequest | null;
          }>(
            `/api/chat/realtime-token${
              chat ? `?chat=${encodeURIComponent(chat.conversationId)}` : ''
            }`,
          )
            .then((res) => {
              if (!res.enabled || !res.tokenRequest) {
                callback('Realtime is not set up', null);
                return;
              }
              callback(null, res.tokenRequest);
            })
            .catch((error: Error) => callback(error.message, null));
        },
      });
      ablyRef.current = client;
      client.connection.on((change) => {
        if (cancelled) return;
        setLive(change.current === 'connected');
        // Back online after a gap: catch up on what was missed.
        if (change.current === 'connected' && change.previous !== 'initialized')
          emit({ type: 'conversation', conversationId: '*' });
      });

      const inbox = client.channels.get(`chat:inbox:${me}`);
      inbox.subscribe(INBOX_EVENT, (message) => {
        // Only the server publishes to inboxes (without a clientId).
        if (message.clientId) return;
        const event = message.data as ChatEvent;
        emit(event);
        if (event.type === 'message' && event.message.senderId !== me) {
          refreshUnread();
          if (openChatRef.current?.conversationId !== event.conversationId) {
            clearTimeout(deliveredTimer.current);
            deliveredTimer.current = setTimeout(
              () => post('/api/chat/delivered', {}),
              300,
            );
          }
          if (openChatRef.current?.conversationId === event.conversationId)
            setTypingUserId(null);
        }
        if (event.type === 'conversation') refreshUnread();
      });

      // Be shown as online while the portal is open.
      client.channels
        .get(`chat:online:${me}`)
        .presence.enter()
        .catch(() => undefined);
    })().catch((error) => console.warn('[chat] realtime unavailable', error));

    return () => {
      cancelled = true;
      client?.close();
      ablyRef.current = null;
      setLive(false);
    };
  }, [me, emit, refreshUnread]);

  /* ------------------------ open chat: typing, online ---------------------- */

  const setOpenChat = useCallback((chat: OpenChat | null) => {
    setOpenChatState((current) =>
      current?.conversationId === chat?.conversationId ? current : chat,
    );
  }, []);

  useEffect(() => {
    openChatRef.current = openChat;
    setPartnerOnline(false);
    setTypingUserId(null);
    const client = ablyRef.current;
    if (!openChat || !client || !live) return;
    let cancelled = false;
    const dm = client.channels.get(`chat:dm:${openChat.conversationId}`);
    const partnerId = openChat.partnerId;
    const online = partnerId
      ? client.channels.get(`chat:online:${partnerId}`)
      : null;

    const onTyping = (message: AblyTypes.Message) => {
      const from = message.clientId;
      if (!from || from === me) return;
      if (partnerId && from !== partnerId) return;
      setTypingUserId(from);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(
        () => setTypingUserId(null),
        TYPING_SHOWN_FOR,
      );
    };
    const syncOnline = () =>
      online?.presence
        .get()
        .then((members) => {
          if (!cancelled)
            setPartnerOnline(members.some((m) => m.clientId === partnerId));
        })
        .catch(() => undefined);

    (async () => {
      // A new token that includes this chat's channels.
      await client.auth.authorize();
      if (cancelled) return;
      await dm.subscribe(TYPING_EVENT, onTyping);
      if (online) {
        await online.presence.subscribe(syncOnline);
        await syncOnline();
      }
    })().catch((error) => console.warn('[chat] could not watch chat', error));

    return () => {
      cancelled = true;
      clearTimeout(typingTimer.current);
      dm.unsubscribe(TYPING_EVENT, onTyping);
      online?.presence.unsubscribe(syncOnline);
      dm.detach().catch(() => undefined);
      online?.detach().catch(() => undefined);
    };
  }, [openChat, live, me]);

  const notifyTyping = useCallback(() => {
    const chat = openChatRef.current;
    const client = ablyRef.current;
    if (!chat || !client || client.connection.state !== 'connected') return;
    const now = Date.now();
    if (now - lastTypingSent.current < TYPING_SEND_EVERY) return;
    lastTypingSent.current = now;
    client.channels
      .get(`chat:dm:${chat.conversationId}`)
      .publish(TYPING_EVENT, {})
      .catch(() => undefined);
  }, []);

  const value = useMemo<ChatContextValue>(
    () => ({
      me,
      live,
      unread,
      refreshUnread,
      subscribe,
      setOpenChat,
      partnerOnline,
      partnerTyping,
      typingUserId,
      notifyTyping,
    }),
    [
      me,
      live,
      unread,
      refreshUnread,
      subscribe,
      setOpenChat,
      partnerOnline,
      partnerTyping,
      typingUserId,
      notifyTyping,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

const FALLBACK: ChatContextValue = {
  me: null,
  live: false,
  unread: 0,
  refreshUnread: () => undefined,
  subscribe: () => () => undefined,
  setOpenChat: () => undefined,
  partnerOnline: false,
  partnerTyping: false,
  typingUserId: null,
  notifyTyping: () => undefined,
};

export const useChat = () => useContext(ChatContext) ?? FALLBACK;

/** Runs `listener` for every inbox event while the component is mounted. */
export function useChatEvents(listener: Listener) {
  const { subscribe } = useChat();
  const ref = useRef(listener);
  ref.current = listener;
  useEffect(() => subscribe((event) => ref.current(event)), [subscribe]);
}
