import type * as AblyTypes from 'ably';
import type { InfiniteData } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
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
import { AppState } from 'react-native';

import { api, withQuery } from './api';
import { useAuth } from './auth';
import { setOpenChat as setPushOpenChat } from './push';
import { queryClient } from './query';
import type { ChatConversation, ChatEvent, ChatMessage } from './types';

/*
 * Messages, as on the website (portal/components/screens/Messages/
 * ChatProvider.tsx): the portal publishes "something changed" events to each
 * person's Ably inbox, and the app updates its cached chats from them. While
 * a chat is open it also sends and shows typing and the other person's
 * online status. Without Ably on the server, the app asks every few seconds.
 */

export type MessagePage = { messages: ChatMessage[]; hasMore: boolean };
export type MessagePages = InfiniteData<MessagePage, string | null>;

export const messagesKey = (conversationId: string) => ['messages', conversationId] as const;

const INBOX_EVENT = 'chat';
const TYPING_EVENT = 'typing';
const TYPING_SEND_EVERY = 2500;
const TYPING_SHOWN_FOR = 4000;

type OpenChat = { conversationId: string; partnerId: string | null };

type ChatValue = {
  /** Ably is connected: no need to poll. */
  live: boolean;
  setOpenChat: (chat: OpenChat | null) => void;
  typingUserId: string | null;
  partnerOnline: boolean;
  notifyTyping: () => void;
};

const ChatContext = createContext<ChatValue | null>(null);

/** Puts a message into a chat's cached pages, or swaps it for its copy. */
export function upsertMessage(conversationId: string, message: ChatMessage) {
  queryClient.setQueryData<MessagePages>(messagesKey(conversationId), (data) => {
    if (!data) return data;
    let found = false;
    const pages = data.pages.map((page) => ({
      ...page,
      messages: page.messages.map((m) => {
        if (m.id === message.id || (m.clientId === message.clientId && m.senderId === message.senderId)) {
          found = true;
          return message;
        }
        return m;
      }),
    }));
    if (!found && pages[0]) pages[0] = { ...pages[0], messages: [message, ...pages[0].messages] };
    return { ...data, pages };
  });
}

/** Ticks: every own message up to `upTo` is delivered or read. */
function applyReceipt(event: Extract<ChatEvent, { type: 'receipt' }>, me: string) {
  queryClient.setQueryData<MessagePages>(messagesKey(event.conversationId), (data) => {
    if (!data) return data;
    const field = event.status === 'read' ? 'readAt' : 'deliveredAt';
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        messages: page.messages.map((m) =>
          m.senderId === me && m.createdAt <= event.upTo && !m[field]
            ? {
                ...m,
                [field]: event.at,
                ...(event.status === 'read' && !m.deliveredAt && { deliveredAt: event.at }),
              }
            : m,
        ),
      })),
    };
  });
}

let refreshTimer: ReturnType<typeof setTimeout> | undefined;
/** The chats list and unread badge, a moment after a burst of events. */
function refreshChats() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    void queryClient.invalidateQueries({ queryKey: ['chatSummary'] });
  }, 250);
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { status, profile } = useAuth();
  const me = status === 'signedIn' ? (profile?.id ?? null) : null;
  const [live, setLive] = useState(false);
  const [openChat, setOpenChatState] = useState<OpenChat | null>(null);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const ablyRef = useRef<AblyTypes.Realtime | null>(null);
  const openChatRef = useRef<OpenChat | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const deliveredTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastTypingSent = useRef(0);

  // The inbox: connect while signed in and the app is on screen.
  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    let client: AblyTypes.Realtime | null = null;

    (async () => {
      const probe = await api<{ enabled: boolean }>('/api/chat/realtime-token').catch(() => ({
        enabled: false,
      }));
      if (cancelled || !probe.enabled) return;
      const Ably = await import('ably');
      if (cancelled) return;
      client = new Ably.Realtime({
        clientId: me,
        echoMessages: false,
        authCallback: (_params, callback) => {
          const chat = openChatRef.current;
          api<{ enabled: boolean; tokenRequest: AblyTypes.TokenRequest | null }>(
            withQuery('/api/chat/realtime-token', { chat: chat?.conversationId }),
          )
            .then((res) => {
              if (!res.enabled || !res.tokenRequest) callback('Realtime is not set up', null);
              else callback(null, res.tokenRequest);
            })
            .catch((error: Error) => callback(error.message, null));
        },
      });
      ablyRef.current = client;
      client.connection.on((change) => {
        if (cancelled) return;
        setLive(change.current === 'connected');
        // Back after a gap: catch up on what was missed.
        if (change.current === 'connected' && change.previous !== 'initialized') {
          refreshChats();
          void queryClient.invalidateQueries({ queryKey: ['messages'] });
        }
      });

      client.channels.get(`chat:inbox:${me}`).subscribe(INBOX_EVENT, (message) => {
        // Only the server publishes to inboxes (without a clientId).
        if (message.clientId) return;
        const event = message.data as ChatEvent;
        if (event.type === 'message' || event.type === 'update')
          upsertMessage(event.conversationId, event.message);
        if (event.type === 'receipt') applyReceipt(event, me);
        if (event.type === 'conversation')
          void queryClient.invalidateQueries({
            queryKey: event.conversationId === '*' ? ['messages'] : messagesKey(event.conversationId),
          });
        refreshChats();
        if (event.type === 'message' && event.message.senderId !== me) {
          const open = openChatRef.current?.conversationId === event.conversationId;
          if (open) {
            setTypingUserId(null);
            void api(`/api/chat/conversations/${event.conversationId}/read`, {
              method: 'POST',
            }).catch(() => null);
          } else {
            clearTimeout(deliveredTimer.current);
            deliveredTimer.current = setTimeout(
              () => void api('/api/chat/delivered', { method: 'POST', body: {} }).catch(() => null),
              300,
            );
          }
        }
      });

      // Shown as online while the app is open.
      client.channels
        .get(`chat:online:${me}`)
        .presence.enter()
        .catch(() => undefined);
    })().catch(() => undefined);

    // Disconnect in the background; pushes cover that time.
    const sub = AppState.addEventListener('change', (state) => {
      const c = ablyRef.current;
      if (!c) return;
      if (state === 'active') c.connect();
      else if (state === 'background') c.close();
    });

    return () => {
      cancelled = true;
      sub.remove();
      client?.close();
      ablyRef.current = null;
      setLive(false);
    };
  }, [me]);

  const setOpenChat = useCallback((chat: OpenChat | null) => {
    setPushOpenChat(chat?.conversationId ?? null);
    setOpenChatState((current) => {
      if (current?.conversationId === chat?.conversationId) return current;
      // Another chat: nobody is typing in it or known online yet.
      setPartnerOnline(false);
      setTypingUserId(null);
      return chat;
    });
  }, []);

  // The open chat: typing and the other person's online status.
  useEffect(() => {
    openChatRef.current = openChat;
    const client = ablyRef.current;
    if (!openChat || !client || !live) return;
    let cancelled = false;
    const dm = client.channels.get(`chat:dm:${openChat.conversationId}`);
    const partnerId = openChat.partnerId;
    const online = partnerId ? client.channels.get(`chat:online:${partnerId}`) : null;

    const onTyping = (message: AblyTypes.InboundMessage) => {
      const from = message.clientId;
      if (!from || from === me) return;
      if (partnerId && from !== partnerId) return;
      setTypingUserId(from);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTypingUserId(null), TYPING_SHOWN_FOR);
    };
    const syncOnline = () =>
      online?.presence
        .get()
        .then((members) => {
          if (!cancelled) setPartnerOnline(members.some((m) => m.clientId === partnerId));
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
    })().catch(() => undefined);

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

  const value = useMemo(
    () => ({ live, setOpenChat, typingUserId, partnerOnline, notifyTyping }),
    [live, setOpenChat, typingUserId, partnerOnline, notifyTyping],
  );
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const value = useContext(ChatContext);
  if (!value) throw new Error('useChat must be used inside ChatProvider');
  return value;
}

/** The chats list; asks again every 15 seconds without Ably. */
export function useConversations() {
  const { live } = useChat();
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => api<{ conversations: ChatConversation[] }>('/api/chat/conversations'),
    refetchInterval: live ? false : 15_000,
  });
}

/** Unread messages for the tab badge. */
export function useChatUnread() {
  const { live } = useChat();
  const { status } = useAuth();
  return useQuery({
    queryKey: ['chatSummary'],
    queryFn: () => api<{ unread: number; chats: number }>('/api/chat/summary'),
    enabled: status === 'signedIn',
    refetchInterval: live ? false : 30_000,
  });
}

/** A chat's name and photo, from the viewer's side. */
export const chatTitle = (c: Pick<ChatConversation, 'kind' | 'partner' | 'group'>) =>
  c.group?.name || c.partner?.name || c.partner?.username || 'Chat';

/** One line about a message, for lists and replies. */
export function previewOf(m: ChatMessage | null | undefined) {
  if (!m) return '';
  if (m.deletedAt) return 'This message was deleted';
  if (m.kind === 'system' && m.system) {
    const s = m.system;
    const who = s.targetNames?.join(', ');
    switch (s.action) {
      case 'created':
        return `${s.actorName} created the group`;
      case 'added':
        return `${s.actorName} added ${who ?? 'people'}`;
      case 'removed':
        return `${s.actorName} removed ${who ?? 'someone'}`;
      case 'left':
        return `${s.actorName} left`;
      case 'renamed':
        return `${s.actorName} renamed the group${s.name ? ` to ${s.name}` : ''}`;
      case 'photo':
        return `${s.actorName} changed the group photo`;
      default:
        return `${s.actorName} updated the group`;
    }
  }
  if (m.kind === 'image') return m.text ? `Photo: ${m.text}` : 'Photo';
  if (m.kind === 'video') return m.text ? `Video: ${m.text}` : 'Video';
  if (m.kind === 'file') return m.attachment?.name ? `File: ${m.attachment.name}` : 'File';
  return m.text;
}
