/*
 * Messages between portal users, WhatsApp style.
 *
 * - `direct`: two people who share an active company; with no company in
 *   common they cannot see or message each other.
 * - `group`: a named group anyone can start with people from their
 *   companies. Its admins add and remove people; someone added later sees
 *   messages from when they joined.
 * - `project`: one group per project, started from the project page. Its
 *   members are always the project's team (everyone in the company for a
 *   CORE project), nobody can add or remove people by hand, and anyone who
 *   joins the team sees the whole history. Its name and photo are the
 *   project's own.
 *
 * MongoDB is the source of truth. Ably only carries "something changed"
 * events to open browsers (see lib/chat/realtime.ts), so nothing is lost when
 * a connection drops.
 */

export type ChatKind = 'text' | 'image' | 'video' | 'file' | 'system';

export type ChatConversationKind = 'direct' | 'group' | 'project';

/** What a `system` message in a group records. */
export type ChatSystemAction =
  | 'created'
  | 'added'
  | 'removed'
  | 'left'
  | 'renamed'
  | 'photo'
  | 'admin';

/**
 * A line like "Asha added Ravi" in a group. Names are kept as they were,
 * so the line still reads well after someone leaves.
 */
export interface ChatSystemNote {
  action: ChatSystemAction;
  actorName: string;
  targetIds?: string[];
  targetNames?: string[];
  /** The new group name, for `renamed`. */
  name?: string | null;
}

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
  /** For `system` messages in groups. */
  system?: ChatSystemNote | null;
  /** Group members named with @ in the text (the mobile app); they hear
   * about it even when the chat is muted. */
  mentions?: string[];
  reactions: ChatReaction[];
  createdAt: string;
  editedAt?: string | null;
  /** When the other person's device received it (two grey ticks). In a
   * group: when everyone's had. */
  deliveredAt?: string | null;
  /** When the other person saw it (two blue ticks). In a group: when
   * everyone has. */
  readAt?: string | null;
  /** Groups, own messages only: how many of the others have seen it. */
  readCount?: number | null;
  /** Groups, own messages only: how many it was sent to. */
  recipientCount?: number | null;
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
  /** Groups (not project groups): messages before this are hidden. */
  joinedAt?: string | null;
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

/** A group's details, for its header, info panel and sender names. */
export interface ChatGroupInfo {
  name: string;
  avatar: string | null;
  description?: string | null;
  /** Everyone in it now, the viewer included, A to Z. */
  members: ChatPerson[];
  adminIds: string[];
  createdById: string | null;
  /** Project groups: the project it belongs to. */
  projectId?: string | null;
  /** Project groups: the project's company. */
  companyName?: string | null;
  /** The viewer may rename it, change its photo and add or remove people. */
  canManage: boolean;
}

/** A conversation as the chats list shows it, from the viewer's side. */
export interface ChatConversation {
  id: string;
  kind: ChatConversationKind;
  /**
   * The other person in a direct chat. For groups a stand-in with the
   * group's name and photo (id `group:<chatId>`), so lists and pickers can
   * treat every chat alike.
   */
  partner: ChatPerson;
  /** Groups and project groups only. */
  group?: ChatGroupInfo | null;
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
  /** Most people in one group. */
  maxGroupMembers: 256,
  maxGroupNameLength: 80,
  /** Messages can be edited this long after sending. */
  editWindowMs: 15 * 60 * 1000,
  /** "Delete for everyone" works this long after sending. */
  deleteWindowMs: 48 * 60 * 60 * 1000,
  /** Photos, videos and files are removed after this many days. */
  mediaRetentionDays: 90,
} as const;
