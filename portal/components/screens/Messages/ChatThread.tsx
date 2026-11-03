'use client';

import * as Menu from '@radix-ui/react-dropdown-menu';
import Link from 'next/link';
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import type { ChatEvent } from '@/models/chat';

import {
  chatApi,
  type ChatConversation,
  type ChatMessage,
  type ChatPerson,
  mediaUrl,
  putFile,
  requestUploads,
} from './api';
import { useChat, useChatEvents } from './ChatProvider';
import { Composer } from './Composer';
import { dayLabelOf, lastSeenText, newClientId, previewOf } from './format';
import { type PreparedFile, prepareFile } from './media';
import { type BubbleAction, MessageBubble } from './MessageBubble';
import {
  DeleteDialog,
  ForwardDialog,
  InfoDialog,
  MediaGallery,
  MediaViewer,
  StagedFiles,
} from './Overlays';
import {
  floatingPanel,
  Icon,
  menuItem,
  RoundButton,
  type SendState,
  Spin,
  UserAvatar,
} from './parts';

const PAGE = 40;
const POLL_MS = 4000;
const OUTBOX_KEY = 'portal.chat.outbox';

/** A message still on this device: sending, uploading or failed. */
interface Pending {
  clientId: string;
  message: ChatMessage;
  state: SendState;
  progress?: number | null;
  localUrl?: string | null;
  file?: PreparedFile;
  abort?: AbortController;
  replyToId?: string | null;
}

type OutboxEntry = {
  conversationId: string;
  clientId: string;
  text: string;
  replyToId?: string | null;
  createdAt: string;
};

const readOutbox = (me: string): OutboxEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(`${OUTBOX_KEY}.${me}`) || '[]');
  } catch {
    return [];
  }
};
const writeOutbox = (me: string, entries: OutboxEntry[]) => {
  try {
    localStorage.setItem(`${OUTBOX_KEY}.${me}`, JSON.stringify(entries));
  } catch {
    /* storage is optional */
  }
};

/** Adds or replaces messages by id, oldest first. */
const merge = (current: ChatMessage[], incoming: ChatMessage[]) => {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return Array.from(byId.values()).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
};

const sameDay = (a: string, b: string) =>
  new Date(a).toDateString() === new Date(b).toDateString();

/** One open chat: header, messages and the message box. */
export const ChatThread = ({
  conversation,
  conversations,
  me,
  jumpTo,
  onBack,
  onChanged,
  openChatWith,
}: {
  conversation: ChatConversation;
  conversations: ChatConversation[];
  me: string | null;
  /** A message to scroll to once loaded (from search). */
  jumpTo: string | null;
  onBack: () => void;
  /** The chat's settings or last message changed. */
  onChanged: (conversation: ChatConversation) => void;
  openChatWith: (person: ChatPerson) => Promise<ChatConversation>;
}) => {
  const conversationId = conversation.id;
  const partner = conversation.partner;
  const partnerName = partner.name || 'Someone';
  const {
    live,
    setOpenChat,
    partnerOnline,
    partnerTyping,
    notifyTyping,
    refreshUnread,
  } = useChat();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstUnread, setFirstUnread] = useState<{
    id: string;
    count: number;
  } | null>(null);

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
  const [infoTarget, setInfoTarget] = useState<ChatMessage | null>(null);
  const [forwardTarget, setForwardTarget] = useState<ChatMessage | null>(null);
  const [viewer, setViewer] = useState<{
    items: ChatMessage[];
    start: string;
  } | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [staged, setStaged] = useState<File[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[] | null>(
    null,
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const [newBelow, setNewBelow] = useState(0);
  const restoreHeight = useRef<number | null>(null);
  const readTimer = useRef<ReturnType<typeof setTimeout>>();
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  /* ------------------------------- loading ------------------------------ */

  const fetchLatest = useCallback(
    () =>
      chatApi<{ messages: ChatMessage[]; hasMore: boolean }>(
        `/api/chat/conversations/${conversationId}/messages?limit=${PAGE}`,
      ),
    [conversationId],
  );

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setPending([]);
    setLoading(true);
    setError(null);
    setReplyTo(null);
    setEditing(null);
    setFirstUnread(null);
    setSearchOpen(false);
    atBottom.current = true;
    fetchLatest()
      .then((res) => {
        if (cancelled) return;
        const list = [...res.messages].reverse();
        setMessages(list);
        setHasMore(res.hasMore);
        const unread = list.filter((m) => m.senderId !== me && !m.readAt);
        if (unread.length)
          setFirstUnread({ id: unread[0].id, count: unread.length });
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [conversationId, fetchLatest, me]);

  // Typing and online status for this chat.
  useEffect(() => {
    setOpenChat({ conversationId, partnerId: partner.id });
    return () => setOpenChat(null);
  }, [conversationId, partner.id, setOpenChat]);

  // Without Ably, ask for new messages every few seconds.
  useEffect(() => {
    if (live || loading) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      fetchLatest()
        .then((res) => setMessages((current) => merge(current, res.messages)))
        .catch(() => undefined);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [live, loading, fetchLatest]);

  const loadOlder = useCallback(async () => {
    const oldest = messagesRef.current[0];
    if (!oldest || loadingOlder) return false;
    setLoadingOlder(true);
    try {
      const res = await chatApi<{ messages: ChatMessage[]; hasMore: boolean }>(
        `/api/chat/conversations/${conversationId}/messages?limit=${PAGE}&before=${encodeURIComponent(oldest.createdAt)}`,
      );
      restoreHeight.current = scrollRef.current?.scrollHeight ?? null;
      setMessages((current) => merge(current, res.messages));
      setHasMore(res.hasMore);
      return res.messages.length > 0;
    } catch {
      return false;
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, loadingOlder]);

  // Keep the view still when older messages are added above.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && restoreHeight.current !== null) {
      el.scrollTop += el.scrollHeight - restoreHeight.current;
      restoreHeight.current = null;
    }
  }, [messages]);

  /* -------------------------------- ticks -------------------------------- */

  const markRead = useCallback(() => {
    clearTimeout(readTimer.current);
    readTimer.current = setTimeout(() => {
      if (document.visibilityState !== 'visible') return;
      const unread = messagesRef.current.some(
        (m) => m.senderId !== me && !m.readAt,
      );
      if (!unread && !conversation.unread) return;
      // Shown as read here straight away; the server tells the sender.
      const now = new Date().toISOString();
      setMessages((current) =>
        current.map((m) =>
          m.senderId !== me && !m.readAt ? { ...m, readAt: now } : m,
        ),
      );
      chatApi(`/api/chat/conversations/${conversationId}/read`, 'POST', {})
        .then(() => {
          onChanged({ ...conversation, unread: 0 });
          refreshUnread();
        })
        .catch(() => undefined);
    }, 400);
  }, [conversation, conversationId, me, onChanged, refreshUnread]);

  useEffect(() => {
    if (!loading) markRead();
  }, [loading, messages.length, markRead]);

  useEffect(() => {
    const onVisible = () =>
      document.visibilityState === 'visible' && markRead();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [markRead]);

  /* ----------------------------- live events ----------------------------- */

  useChatEvents((event: ChatEvent) => {
    if (event.type === 'conversation') {
      if (
        event.conversationId === conversationId ||
        event.conversationId === '*'
      )
        fetchLatest()
          .then((res) => setMessages((current) => merge(current, res.messages)))
          .catch(() => undefined);
      return;
    }
    if (event.conversationId !== conversationId) return;
    if (event.type === 'message') {
      const m = event.message;
      if (m.senderId === me)
        setPending((p) => p.filter((x) => x.clientId !== m.clientId));
      setMessages((current) => merge(current, [m]));
      if (m.senderId !== me && !atBottom.current) setNewBelow((n) => n + 1);
    }
    if (event.type === 'update')
      setMessages((current) => merge(current, [event.message]));
    if (event.type === 'receipt' && event.by !== me) {
      setMessages((current) =>
        current.map((m) => {
          if (m.senderId !== me || m.createdAt > event.upTo) return m;
          if (event.status === 'read')
            return {
              ...m,
              readAt: m.readAt ?? event.at,
              deliveredAt: m.deliveredAt ?? event.at,
            };
          return m.deliveredAt ? m : { ...m, deliveredAt: event.at };
        }),
      );
    }
  });

  /* ------------------------------- scrolling ----------------------------- */

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    setNewBelow(0);
  }, []);

  // First paint: the unread divider, or the newest message.
  useLayoutEffect(() => {
    if (loading) return;
    const divider = document.getElementById('chat-unread-divider');
    if (divider) divider.scrollIntoView({ block: 'center' });
    else scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, conversationId]);

  const itemCount = messages.length + pending.length;
  const lastMine =
    pending.length > 0 || messages[messages.length - 1]?.senderId === me;
  useLayoutEffect(() => {
    if (loading) return;
    if (atBottom.current || lastMine) scrollToBottom(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemCount]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottom.current = fromBottom < 120;
    setShowJump(fromBottom > 400);
    if (atBottom.current) setNewBelow(0);
    if (el.scrollTop < 120 && hasMore && !loadingOlder) loadOlder();
  };

  const jumpToMessage = useCallback(
    async (id: string) => {
      for (let i = 0; i < 15; i++) {
        const el = document.getElementById(`msg-${id}`);
        if (el) {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          setHighlight(id);
          setTimeout(() => setHighlight((h) => (h === id ? null : h)), 2000);
          return;
        }
        const more = await loadOlder();
        if (!more) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      toast.info('That message is no longer in this chat.');
    },
    [loadOlder],
  );

  useEffect(() => {
    if (jumpTo && !loading) jumpToMessage(jumpTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo, loading]);

  /* -------------------------------- sending ------------------------------ */

  const fakeMessage = useCallback(
    (clientId: string, fields: Partial<ChatMessage>): ChatMessage => ({
      id: `pending:${clientId}`,
      conversationId,
      senderId: me ?? '',
      clientId,
      kind: 'text',
      text: '',
      reactions: [],
      createdAt: new Date().toISOString(),
      ...fields,
    }),
    [conversationId, me],
  );

  const finishSend = useCallback(
    (clientId: string, message: ChatMessage) => {
      setPending((p) => {
        const done = p.find((x) => x.clientId === clientId);
        if (done?.localUrl)
          setTimeout(() => URL.revokeObjectURL(done.localUrl!), 5000);
        return p.filter((x) => x.clientId !== clientId);
      });
      setMessages((current) => merge(current, [message]));
      onChanged({
        ...conversation,
        lastMessage: message,
        lastMessageAt: message.createdAt,
      });
      if (me)
        writeOutbox(
          me,
          readOutbox(me).filter((e) => e.clientId !== clientId),
        );
    },
    [conversation, me, onChanged],
  );

  const sendTextNow = useCallback(
    async (entry: OutboxEntry) => {
      try {
        const res = await chatApi<{ message: ChatMessage }>(
          `/api/chat/conversations/${conversationId}/messages`,
          'POST',
          {
            clientId: entry.clientId,
            text: entry.text,
            replyToId: entry.replyToId,
          },
        );
        finishSend(entry.clientId, res.message);
      } catch (e) {
        const status = (e as { status?: number }).status;
        // A rejected message (not a lost connection) won't succeed later.
        if (status && status < 500 && me)
          writeOutbox(
            me,
            readOutbox(me).filter((x) => x.clientId !== entry.clientId),
          );
        setPending((p) =>
          p.map((x) =>
            x.clientId === entry.clientId ? { ...x, state: 'failed' } : x,
          ),
        );
        if (status && status < 500) toast.error((e as Error).message);
      }
    },
    [conversationId, finishSend, me],
  );

  const sendText = (text: string) => {
    const clientId = newClientId();
    const entry: OutboxEntry = {
      conversationId,
      clientId,
      text,
      replyToId: replyTo?.id ?? null,
      createdAt: new Date().toISOString(),
    };
    if (me) writeOutbox(me, [...readOutbox(me), entry]);
    setPending((p) => [
      ...p,
      {
        clientId,
        state: 'sending',
        replyToId: entry.replyToId,
        message: fakeMessage(clientId, {
          text,
          replyTo: replyTo
            ? {
                id: replyTo.id,
                senderId: replyTo.senderId,
                kind: replyTo.kind,
                text: previewOf(replyTo),
              }
            : null,
        }),
      },
    ]);
    setReplyTo(null);
    atBottom.current = true;
    sendTextNow(entry);
  };

  // Messages written offline (or that failed) are sent when back online.
  useEffect(() => {
    if (!me || loading) return;
    const waiting = readOutbox(me).filter(
      (e) => e.conversationId === conversationId,
    );
    if (!waiting.length) return;
    setPending((p) => [
      ...p.filter((x) => !waiting.some((w) => w.clientId === x.clientId)),
      ...waiting.map((w) => ({
        clientId: w.clientId,
        state: 'sending' as SendState,
        message: fakeMessage(w.clientId, {
          text: w.text,
          createdAt: w.createdAt,
        }),
      })),
    ]);
    waiting.forEach(sendTextNow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, loading, conversationId]);

  useEffect(() => {
    if (!me) return;
    const onOnline = () => {
      const waiting = readOutbox(me).filter(
        (e) => e.conversationId === conversationId,
      );
      setPending((p) =>
        p.map((x) =>
          waiting.some((w) => w.clientId === x.clientId)
            ? { ...x, state: 'sending' }
            : x,
        ),
      );
      waiting.forEach(sendTextNow);
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [me, conversationId, sendTextNow]);

  const uploadAndSend = useCallback(
    async (item: Pending) => {
      const file = item.file!;
      const abort = new AbortController();
      setPending((p) =>
        p.map((x) =>
          x.clientId === item.clientId
            ? { ...x, state: 'sending', progress: 0, abort }
            : x,
        ),
      );
      try {
        const files = [
          {
            name: file.name,
            mime: file.mime,
            size: file.file.size,
            role: 'main' as const,
          },
          ...(file.thumb
            ? [
                {
                  name: `${file.name}.jpg`,
                  mime: 'image/jpeg',
                  size: file.thumb.size,
                  role: 'thumb' as const,
                },
              ]
            : []),
        ];
        const { uploads } = await requestUploads(conversationId, files);
        await putFile(
          uploads[0],
          file.file,
          (progress) =>
            setPending((p) =>
              p.map((x) =>
                x.clientId === item.clientId ? { ...x, progress } : x,
              ),
            ),
          abort.signal,
        );
        if (file.thumb && uploads[1])
          await putFile(uploads[1], file.thumb, undefined, abort.signal);
        const res = await chatApi<{ message: ChatMessage }>(
          `/api/chat/conversations/${conversationId}/messages`,
          'POST',
          {
            clientId: item.clientId,
            text: item.message.text,
            replyToId: item.replyToId ?? null,
            attachment: {
              key: uploads[0].key,
              name: file.name,
              mime: file.mime,
              width: file.width ?? null,
              height: file.height ?? null,
              duration: file.duration ?? null,
              thumbKey: file.thumb && uploads[1] ? uploads[1].key : null,
            },
          },
        );
        finishSend(item.clientId, res.message);
      } catch (e) {
        if ((e as Error).name === 'AbortError') {
          setPending((p) => p.filter((x) => x.clientId !== item.clientId));
          return;
        }
        toast.error((e as Error).message);
        setPending((p) =>
          p.map((x) =>
            x.clientId === item.clientId
              ? { ...x, state: 'failed', progress: null }
              : x,
          ),
        );
      }
    },
    [conversationId, finishSend],
  );

  const sendFiles = async (files: File[], caption: string) => {
    setStaged(null);
    atBottom.current = true;
    const replyToId = replyTo?.id ?? null;
    setReplyTo(null);
    for (let i = 0; i < files.length; i++) {
      const prepared = await prepareFile(files[i]);
      const clientId = newClientId();
      const kind = prepared.mime.startsWith('image/')
        ? 'image'
        : prepared.mime.startsWith('video/')
          ? 'video'
          : 'file';
      const item: Pending = {
        clientId,
        state: 'sending',
        progress: 0,
        localUrl: prepared.previewUrl ?? null,
        file: prepared,
        replyToId: i === 0 ? replyToId : null,
        message: fakeMessage(clientId, {
          kind,
          // The caption goes with the first file.
          text: i === 0 ? caption : '',
          attachment: {
            key: '',
            name: prepared.name,
            mime: prepared.mime,
            size: prepared.file.size,
            width: prepared.width,
            height: prepared.height,
            duration: prepared.duration,
          },
        }),
      };
      setPending((p) => [...p, item]);
      await uploadAndSend(item);
    }
  };

  /* -------------------------------- actions ------------------------------ */

  const onAction = (action: BubbleAction, m: ChatMessage) => {
    const item = pending.find((p) => p.message.id === m.id);
    switch (action) {
      case 'reply':
        setEditing(null);
        setReplyTo(m);
        break;
      case 'copy':
        navigator.clipboard
          ?.writeText(m.text)
          .then(() => toast.success('Copied'));
        break;
      case 'forward':
        setForwardTarget(m);
        break;
      case 'edit':
        setReplyTo(null);
        setEditing(m);
        break;
      case 'info':
        setInfoTarget(m);
        break;
      case 'delete':
        setDeleteTarget(m);
        break;
      case 'download':
        window.location.href = mediaUrl(m.id, { download: true });
        break;
      case 'cancel':
        item?.abort?.abort();
        if (item && !item.abort)
          setPending((p) => p.filter((x) => x.clientId !== item.clientId));
        break;
      case 'retry':
        if (!item) break;
        if (item.file) uploadAndSend(item);
        else {
          setPending((p) =>
            p.map((x) =>
              x.clientId === item.clientId ? { ...x, state: 'sending' } : x,
            ),
          );
          const entry: OutboxEntry = {
            conversationId,
            clientId: item.clientId,
            text: item.message.text,
            replyToId: item.replyToId,
            createdAt: item.message.createdAt,
          };
          if (me && !readOutbox(me).some((e) => e.clientId === item.clientId))
            writeOutbox(me, [...readOutbox(me), entry]);
          sendTextNow(entry);
        }
        break;
    }
  };

  const react = async (m: ChatMessage, emoji: string | null) => {
    // Shown straight away; the server's copy replaces it.
    setMessages((current) =>
      current.map((x) =>
        x.id === m.id
          ? {
              ...x,
              reactions: [
                ...x.reactions.filter((r) => r.userId !== me),
                ...(emoji && me ? [{ userId: me, emoji }] : []),
              ],
            }
          : x,
      ),
    );
    try {
      const res = await chatApi<{ message: ChatMessage }>(
        `/api/chat/messages/${m.id}/react`,
        'POST',
        { emoji },
      );
      setMessages((current) => merge(current, [res.message]));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const saveEdit = async (text: string) => {
    const target = editing;
    setEditing(null);
    if (!target) return;
    try {
      const res = await chatApi<{ message: ChatMessage }>(
        `/api/chat/messages/${target.id}`,
        'PATCH',
        { text },
      );
      setMessages((current) => merge(current, [res.message]));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const doDelete = async (scope: 'me' | 'everyone') => {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    try {
      const res = await chatApi<{ message: ChatMessage | null }>(
        `/api/chat/messages/${target.id}?for=${scope}`,
        'DELETE',
      );
      if (scope === 'me')
        setMessages((current) => current.filter((m) => m.id !== target.id));
      else if (res.message)
        setMessages((current) => merge(current, [res.message!]));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const forward = async (people: ChatPerson[]) => {
    const target = forwardTarget;
    if (!target) return;
    let sent = 0;
    for (const person of people) {
      try {
        const room = await openChatWith(person);
        const res = await chatApi<{ message: ChatMessage }>(
          `/api/chat/conversations/${room.id}/messages`,
          'POST',
          { clientId: newClientId(), forwardOfId: target.id },
        );
        sent++;
        if (room.id === conversationId)
          setMessages((current) => merge(current, [res.message]));
      } catch (e) {
        toast.error(`${person.name}: ${(e as Error).message}`);
      }
    }
    setForwardTarget(null);
    if (sent)
      toast.success(sent === 1 ? 'Forwarded' : `Forwarded to ${sent} people`);
  };

  const setPref = async (
    prefs: Partial<Pick<ChatConversation, 'muted' | 'pinned' | 'archived'>>,
  ) => {
    onChanged({ ...conversation, ...prefs });
    try {
      const res = await chatApi<{ conversation: ChatConversation }>(
        `/api/chat/conversations/${conversationId}`,
        'PATCH',
        prefs,
      );
      onChanged(res.conversation);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const clearChat = async () => {
    if (
      !window.confirm(
        `Clear all messages with ${partnerName}? This only clears them for you.`,
      )
    )
      return;
    try {
      await chatApi(
        `/api/chat/conversations/${conversationId}/clear`,
        'POST',
        {},
      );
      setMessages([]);
      setHasMore(false);
      onChanged({ ...conversation, lastMessage: null, unread: 0 });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  useEffect(() => {
    if (!searchOpen) return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(() => {
      chatApi<{ messages: ChatMessage[] }>(
        `/api/chat/search?chat=${conversationId}&q=${encodeURIComponent(q)}`,
      )
        .then((res) => setSearchResults(res.messages))
        .catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchOpen, conversationId]);

  /* -------------------------------- render ------------------------------- */

  const items = useMemo(() => {
    const shown = [
      ...messages.map((m) => ({ message: m, pending: null as Pending | null })),
      ...pending.map((p) => ({ message: p.message, pending: p })),
    ];
    return shown;
  }, [messages, pending]);

  const visualMedia = useMemo(
    () =>
      messages.filter(
        (m) =>
          (m.kind === 'image' || m.kind === 'video') &&
          m.attachment &&
          !m.attachment.expiredAt &&
          !m.deletedAt,
      ),
    [messages],
  );

  const status = partnerTyping
    ? 'typing…'
    : partnerOnline
      ? 'online'
      : lastSeenText(conversation.partnerLastSeenAt) ||
        (partner.companies ?? []).join(', ');

  return (
    <div
      className="relative flex h-full min-h-0 flex-col"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) setStaged(files);
      }}
    >
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-neutral-950 px-2 auto-light:border-black/[0.06] auto-light:bg-neutral-100">
        {searchOpen ? (
          <>
            <RoundButton
              icon="arrow_back"
              label="Close search"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery('');
              }}
            />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in chat with ${partnerName}`}
              className="h-10 min-w-0 flex-1 rounded-full bg-white/[0.07] px-4 text-sm outline-none auto-light:bg-white"
            />
          </>
        ) : (
          <>
            <RoundButton
              icon="arrow_back"
              label="Back to chats"
              onClick={onBack}
              className="md:hidden"
            />
            <Link
              href={`/user/${partner.id}`}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 pl-1"
            >
              <UserAvatar src={partner.avatar} name={partner.name} size={40} />
              <span className="min-w-0">
                <span className="block truncate font-semibold leading-tight">
                  {partnerName}
                </span>
                <span
                  className={cn(
                    'block truncate text-xs',
                    partnerTyping || partnerOnline
                      ? 'text-emerald-400 auto-light:text-emerald-600'
                      : 'text-neutral-500',
                  )}
                >
                  {status}
                </span>
              </span>
            </Link>
            <RoundButton
              icon="search"
              label="Search in chat"
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex"
            />
            <Menu.Root modal={false}>
              <Menu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Chat options"
                  className="flex size-10 items-center justify-center rounded-full text-[22px] text-neutral-400 hover:bg-white/[0.07] auto-light:text-neutral-500 auto-light:hover:bg-black/[0.05]"
                >
                  <Icon name="more_vert" />
                </button>
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Content
                  align="end"
                  sideOffset={4}
                  className={cn(floatingPanel, 'w-56 py-1')}
                >
                  <Menu.Item
                    className={menuItem}
                    onSelect={() => setSearchOpen(true)}
                  >
                    <Icon name="search" className="text-[18px]" /> Search
                  </Menu.Item>
                  <Menu.Item
                    className={menuItem}
                    onSelect={() => setGalleryOpen(true)}
                  >
                    <Icon name="perm_media" className="text-[18px]" /> Media and
                    files
                  </Menu.Item>
                  <Menu.Item
                    className={menuItem}
                    onSelect={() => setPref({ muted: !conversation.muted })}
                  >
                    <Icon
                      name={
                        conversation.muted
                          ? 'notifications'
                          : 'notifications_off'
                      }
                      className="text-[18px]"
                    />
                    {conversation.muted
                      ? 'Unmute notifications'
                      : 'Mute notifications'}
                  </Menu.Item>
                  <Menu.Item
                    className={menuItem}
                    onSelect={() => setPref({ pinned: !conversation.pinned })}
                  >
                    <Icon name="keep" className="text-[18px]" />
                    {conversation.pinned ? 'Unpin chat' : 'Pin chat'}
                  </Menu.Item>
                  <Menu.Item
                    className={menuItem}
                    onSelect={() =>
                      setPref({ archived: !conversation.archived })
                    }
                  >
                    <Icon name="archive" className="text-[18px]" />
                    {conversation.archived ? 'Unarchive chat' : 'Archive chat'}
                  </Menu.Item>
                  <Menu.Separator className="my-1 h-px bg-white/10 auto-light:bg-black/10" />
                  <Menu.Item
                    className={cn(
                      menuItem,
                      'text-rose-300 auto-light:text-rose-600',
                    )}
                    onSelect={clearChat}
                  >
                    <Icon name="mop" className="text-[18px]" /> Clear chat
                  </Menu.Item>
                </Menu.Content>
              </Menu.Portal>
            </Menu.Root>
          </>
        )}
      </div>

      {searchOpen && searchResults && (
        <div
          className={cn(
            floatingPanel,
            'absolute inset-x-2 top-[68px] max-h-[50%] overflow-y-auto py-1',
          )}
        >
          {!searchResults.length && (
            <p className="px-4 py-3 text-sm text-neutral-500">
              No messages found.
            </p>
          )}
          {searchResults.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery('');
                jumpToMessage(m.id);
              }}
              className={cn(menuItem, 'flex-col items-start gap-0.5')}
            >
              <span className="text-xs text-neutral-500">
                {m.senderId === me ? 'You' : partnerName} ·{' '}
                {dayLabelOf(m.createdAt)}
              </span>
              <span className="line-clamp-2">{previewOf(m)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="quiet-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#0c0f0e] pb-3 auto-light:bg-[#efeae2]"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-neutral-500">
            <Spin /> Loading messages…
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-neutral-400">
            <Icon name="error" className="text-[32px] text-rose-400" />
            {error}
          </div>
        ) : (
          <>
            <div className="flex justify-center py-3">
              {loadingOlder ? (
                <Spin />
              ) : !hasMore ? (
                <p className="mx-6 max-w-sm rounded-lg bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-200/80 auto-light:bg-amber-100 auto-light:text-amber-900">
                  <Icon name="lock" className="mr-1 align-[-2px] text-[13px]" />
                  Only you and {partnerName} can see these messages. Photos,
                  videos and files are kept for 90 days.
                </p>
              ) : null}
            </div>
            {items.map(({ message: m, pending: p }, i) => {
              const prev = items[i - 1]?.message;
              const newDay = !prev || !sameDay(prev.createdAt, m.createdAt);
              const first = newDay || prev?.senderId !== m.senderId;
              return (
                <Fragment key={m.id}>
                  {newDay && (
                    <div className="flex justify-center py-2">
                      <span className="rounded-lg bg-neutral-800 px-3 py-1 text-xs font-medium text-neutral-300 shadow auto-light:bg-white auto-light:text-neutral-600">
                        {dayLabelOf(m.createdAt)}
                      </span>
                    </div>
                  )}
                  {firstUnread?.id === m.id && (
                    <div
                      id="chat-unread-divider"
                      className="my-2 flex justify-center bg-white/[0.04] py-1 auto-light:bg-black/[0.04]"
                    >
                      <span className="rounded-full bg-neutral-800 px-3 py-0.5 text-xs text-neutral-300 auto-light:bg-white auto-light:text-neutral-600">
                        {firstUnread.count} unread{' '}
                        {firstUnread.count === 1 ? 'message' : 'messages'}
                      </span>
                    </div>
                  )}
                  <MessageBubble
                    message={m}
                    mine={m.senderId === me}
                    state={p ? p.state : 'sent'}
                    progress={p?.progress}
                    localUrl={p?.localUrl}
                    partnerName={partnerName}
                    me={me}
                    first={first}
                    highlighted={highlight === m.id}
                    onAction={onAction}
                    onReact={react}
                    onOpenMedia={(msg) =>
                      setViewer({ items: visualMedia, start: msg.id })
                    }
                    onJumpTo={jumpToMessage}
                  />
                </Fragment>
              );
            })}
            {!items.length && (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <UserAvatar
                  src={partner.avatar}
                  name={partner.name}
                  size={72}
                />
                <p className="font-medium">{partnerName}</p>
                <p className="text-sm text-neutral-500">
                  {(partner.companies ?? []).join(', ')}
                </p>
                <p className="mt-2 text-sm text-neutral-400">Say hi 👋</p>
              </div>
            )}
          </>
        )}
      </div>

      {showJump && (
        <button
          type="button"
          aria-label="Scroll to the newest message"
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-24 right-4 z-10 flex size-10 items-center justify-center rounded-full bg-neutral-800 text-[24px] text-neutral-200 shadow-lg auto-light:bg-white auto-light:text-neutral-700"
        >
          <Icon name="keyboard_arrow_down" />
          {newBelow > 0 && (
            <span className="absolute -top-1.5 right-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[11px] font-semibold text-neutral-950">
              {newBelow}
            </span>
          )}
        </button>
      )}

      <Composer
        conversationId={conversationId}
        me={me}
        partnerName={partnerName}
        replyTo={replyTo}
        editing={editing}
        onCancelReply={() => setReplyTo(null)}
        onCancelEdit={() => setEditing(null)}
        onSend={sendText}
        onSaveEdit={saveEdit}
        onPickFiles={(files) => setStaged(files)}
        onTyping={notifyTyping}
      />

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-neutral-950/80 text-lg font-medium auto-light:bg-white/80">
          <span className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-emerald-500 px-8 py-6">
            <Icon name="upload" className="text-[28px]" /> Drop to send to{' '}
            {partnerName}
          </span>
        </div>
      )}

      {staged && (
        <StagedFiles
          files={staged}
          partnerName={partnerName}
          onClose={() => setStaged(null)}
          onSend={sendFiles}
        />
      )}

      <DeleteDialog
        message={deleteTarget}
        mine={deleteTarget?.senderId === me}
        onClose={() => setDeleteTarget(null)}
        onDelete={doDelete}
      />
      <InfoDialog message={infoTarget} onClose={() => setInfoTarget(null)} />
      <ForwardDialog
        message={forwardTarget}
        conversations={conversations}
        onClose={() => setForwardTarget(null)}
        onForward={forward}
      />
      <MediaGallery
        open={galleryOpen}
        conversationId={conversationId}
        onClose={() => setGalleryOpen(false)}
        onOpenMedia={(m, all) => {
          setGalleryOpen(false);
          setViewer({ items: [...all].reverse(), start: m.id });
        }}
      />
      {viewer && (
        <MediaViewer
          items={viewer.items}
          start={viewer.start}
          title={(m) => (m.senderId === me ? 'You' : partnerName)}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
};
