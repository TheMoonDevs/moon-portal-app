/*
 * Direct messages between portal users, WhatsApp style. Two people can chat
 * when they share an active company; with no company in common they cannot
 * see or message each other. Group chats come later (`kind: 'group'`).
 *
 * MongoDB is the source of truth. Ably only carries "something changed"
 * events to open browsers (see lib/chat/realtime.ts), so nothing is lost when
 * a connection drops.
 */

export type ChatKind = 'text' | 'image' | 'video' | 'file';

/** A photo, video or file. Stored privately in Spaces under `chat/`. */
export interface ChatAttachment {
  key: string;
  name: string;
  mime: string;
  size: number;
  width?: number | null;
  height?: number | null;
  /** Seconds, for videos. */
  duration?: number | null;
  /** A small preview: a resized photo, or a video's first frame. */
  thumbKey?: string | null;
  /** Set when the file was removed (media is kept for 90 days). */
  expiredAt?: string | null;
}

export interface ChatReaction {
  userId: string;
  emoji: string;
}

/** A short copy of the message being replied to, shown above the reply. */
export interface ChatReplyPreview {
  id: string;
  senderId: string;
  kind: ChatKind;
  text: string;
}

/** A message as the API returns it. */
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  /** Made by the sender's browser, so a retried send is saved only once. */
  clientId: string;
  kind: ChatKind;
  text: string;
  attachment?: ChatAttachment | null;
  replyTo?: ChatReplyPreview | null;
  forwarded?: boolean;
  reactions: ChatReaction[];
  createdAt: string;
  editedAt?: string | null;
  /** When the other person's device received it (two grey ticks). */
  deliveredAt?: string | null;
  /** When the other person saw it (two blue ticks). */
  readAt?: string | null;
  /** "This message was deleted": text and file are gone. */
  deletedAt?: string | null;
}

/** One person's settings and counters in a conversation. */
export interface ChatMemberState {
  unread: number;
  muted?: boolean;
  pinned?: boolean;
  archived?: boolean;
  /** "Clear chat": messages before this are hidden for this person. */
  clearedAt?: string | null;
}

export interface ChatPerson {
  id: string;
  name: string | null;
  username?: string | null;
  avatar?: string | null;
  positionTitle?: string | null;
  /** The companies both people are in, by name. */
  companies?: string[];
}

/** A conversation as the chats list shows it, from the viewer's side. */
export interface ChatConversation {
  id: string;
  kind: 'direct';
  partner: ChatPerson;
  lastMessage: ChatMessage | null;
  lastMessageAt: string | null;
  unread: number;
  muted: boolean;
  pinned: boolean;
  archived: boolean;
  /** The partner's last time in the portal, for "last seen". */
  partnerLastSeenAt: string | null;
}

/** Events sent to each person's inbox channel (lib/chat/realtime.ts). */
export type ChatEvent =
  | { type: 'message'; conversationId: string; message: ChatMessage }
  | { type: 'update'; conversationId: string; message: ChatMessage }
  | {
      type: 'receipt';
      conversationId: string;
      /** Who received or read the messages. */
      by: string;
      status: 'delivered' | 'read';
      /** Every message sent up to this time is now delivered or read. */
      upTo: string;
      at: string;
    }
  | { type: 'conversation'; conversationId: string };

export const CHAT_LIMITS = {
  /** Largest video or file. */
  maxFileBytes: 100 * 1024 * 1024,
  /** Largest photo, after it is resized in the browser. */
  maxImageBytes: 20 * 1024 * 1024,
  maxTextLength: 8000,
  /** Messages can be edited this long after sending. */
  editWindowMs: 15 * 60 * 1000,
  /** "Delete for everyone" works this long after sending. */
  deleteWindowMs: 48 * 60 * 60 * 1000,
  /** Photos, videos and files are removed after this many days. */
  mediaRetentionDays: 90,
} as const;
