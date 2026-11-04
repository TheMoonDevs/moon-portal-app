import { ObjectId } from 'mongodb';

import { getMongoDb } from '@/lib/db/mongoose';
import { db } from '@/lib/mongodb/db-client';
import { sortByRecentPoints } from '@/lib/progress/myPoints';
import { sendPushToUsers } from '@/lib/push/server';
import {
  CHAT_LIMITS,
  type ChatAttachment,
  type ChatConversation,
  type ChatKind,
  type ChatMemberState,
  type ChatMessage,
  type ChatPerson,
  type ChatReplyPreview,
} from '@/models/chat';
import type { Company, CompanyMember } from '@/models/workspace';
import { COMPANY_STATUS, MEMBER_STATUS } from '@/models/workspace';

import { publishToUsers } from './realtime';
import { chatPrefix, deleteMedia, kindOfMime, storedSize } from './storage';

/*
 * Direct messages. See models/chat.ts for the shapes and the rules.
 *
 * Collections (raw MongoDB, ids kept as strings):
 *   ChatConversation  one per pair of people, `key` is "<idA>:<idB>" sorted.
 *   ChatMessage       one per message, newest read first by conversation.
 *   ChatPresence      each person's last time in the portal ("last seen").
 */

type ConversationDoc = {
  _id: ObjectId;
  kind: 'direct';
  key: string;
  memberIds: string[];
  state: Record<string, ChatMemberState>;
  lastMessageId?: string | null;
  lastMessageAt?: Date | null;
  createdAt: Date;
};

type MessageDoc = {
  _id: ObjectId;
  conversationId: string;
  senderId: string;
  recipientIds: string[];
  clientId: string;
  kind: ChatKind;
  text: string;
  attachment?: ChatAttachment | null;
  replyTo?: ChatReplyPreview | null;
  forwarded?: boolean;
  reactions: { userId: string; emoji: string }[];
  createdAt: Date;
  editedAt?: Date | null;
  deliveredAt?: Date | null;
  readAt?: Date | null;
  deletedAt?: Date | null;
  /** People who chose "Delete for me". */
  hiddenFor?: string[];
};

type PresenceDoc = { _id: string; lastSeenAt: Date };

export class ChatError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Collections                                */
/* -------------------------------------------------------------------------- */

let indexesReady: Promise<void> | null = null;

async function collections() {
  const mongo = await getMongoDb();
  const conversations = mongo.collection<ConversationDoc>('ChatConversation');
  const messages = mongo.collection<MessageDoc>('ChatMessage');
  const presence = mongo.collection<PresenceDoc>('ChatPresence');
  indexesReady ??= Promise.all([
    conversations.createIndex({ key: 1 }, { unique: true }),
    conversations.createIndex({ memberIds: 1, lastMessageAt: -1 }),
    messages.createIndex({ conversationId: 1, createdAt: -1 }),
    messages.createIndex({ senderId: 1, clientId: 1 }, { unique: true }),
    messages.createIndex({ recipientIds: 1, deliveredAt: 1 }),
    messages.createIndex(
      { createdAt: 1 },
      {
        name: 'media_by_age',
        partialFilterExpression: { 'attachment.key': { $exists: true } },
      },
    ),
  ])
    .then(() => undefined)
    .catch((error) => {
      indexesReady = null;
      console.error('[chat] creating indexes failed:', error);
    });
  await indexesReady;
  return { conversations, messages, presence };
}

const iso = (value?: Date | null) => (value ? value.toISOString() : null);

const toObjectId = (id: string) => {
  if (!ObjectId.isValid(id)) throw new ChatError(404, 'Chat not found.');
  return new ObjectId(id);
};

/* -------------------------------------------------------------------------- */
/*                                 Connections                                */
/* -------------------------------------------------------------------------- */

/**
 * Everyone the person can chat with: people in at least one active company
 * with them, each with the names of the companies they share.
 */
export async function contactsOf(userId: string) {
  const mine: CompanyMember[] = await db.companyMember.findMany({
    where: { userId, status: MEMBER_STATUS.ACTIVE },
    select: { companyId: true },
  });
  const companyIds = Array.from(new Set(mine.map((m) => m.companyId)));
  if (!companyIds.length) return new Map<string, string[]>();
  const found: Company[] = await db.company.findMany({
    where: { id: { in: companyIds }, status: COMPANY_STATUS.ACTIVE },
    select: { id: true, name: true },
  });
  // Shared companies are named in the person's own order: the ones they
  // work in most first.
  const companies = await sortByRecentPoints(userId, found, (c) => c.id);
  const names = new Map(companies.map((c) => [c.id, c.name]));
  if (!names.size) return new Map<string, string[]>();
  const members: CompanyMember[] = await db.companyMember.findMany({
    where: {
      companyId: { in: Array.from(names.keys()) },
      status: MEMBER_STATUS.ACTIVE,
    },
    select: { userId: true, companyId: true },
  });
  const rank = new Map(companies.map((c, i) => [c.id, i]));
  members.sort(
    (a, b) => (rank.get(a.companyId) ?? 0) - (rank.get(b.companyId) ?? 0),
  );
  const contacts = new Map<string, string[]>();
  for (const m of members) {
    if (!m.userId || m.userId === userId) continue;
    const list = contacts.get(m.userId) ?? [];
    const name = names.get(m.companyId);
    if (name && !list.includes(name)) list.push(name);
    contacts.set(m.userId, list);
  }
  return contacts;
}

/** The companies two people share, by name; empty when they share none. */
async function sharedCompanies(userId: string, otherId: string) {
  return (await contactsOf(userId)).get(otherId) ?? [];
}

async function peopleById(ids: string[]): Promise<Map<string, ChatPerson>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return new Map();
  const users: ChatPerson[] = await db.user.findMany({
    where: { id: { in: unique } },
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
      positionTitle: true,
    },
  });
  return new Map(users.map((u) => [u.id, u]));
}

/** People the person can start a chat with, A to Z. */
export async function listContacts(userId: string): Promise<ChatPerson[]> {
  const contacts = await contactsOf(userId);
  const people = await peopleById(Array.from(contacts.keys()));
  return Array.from(contacts.entries())
    .map(([id, companies]) => {
      const person = people.get(id);
      return person ? { ...person, companies } : null;
    })
    .filter((p): p is ChatPerson & { companies: string[] } => !!p)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

/* -------------------------------------------------------------------------- */
/*                                  Mapping                                   */
/* -------------------------------------------------------------------------- */

const PREVIEW_OF_KIND: Record<ChatKind, string> = {
  text: '',
  image: 'Photo',
  video: 'Video',
  file: 'File',
};

/** One line describing a message, for notifications and replies. */
export const previewText = (
  m: Pick<MessageDoc, 'kind' | 'text' | 'attachment'>,
) => {
  const text = (m.text || '').replace(/\s+/g, ' ').trim();
  if (m.kind === 'text') return text;
  const label =
    m.kind === 'file' ? m.attachment?.name || 'File' : PREVIEW_OF_KIND[m.kind];
  return text ? `${label}: ${text}` : label;
};

function toMessage(doc: MessageDoc): ChatMessage {
  const deleted = !!doc.deletedAt;
  return {
    id: doc._id.toHexString(),
    conversationId: doc.conversationId,
    senderId: doc.senderId,
    clientId: doc.clientId,
    kind: deleted ? 'text' : doc.kind,
    text: deleted ? '' : doc.text,
    attachment: deleted ? null : (doc.attachment ?? null),
    replyTo: deleted ? null : (doc.replyTo ?? null),
    forwarded: !!doc.forwarded,
    reactions: deleted ? [] : (doc.reactions ?? []),
    createdAt: doc.createdAt.toISOString(),
    editedAt: iso(doc.editedAt),
    deliveredAt: iso(doc.deliveredAt),
    readAt: iso(doc.readAt),
    deletedAt: iso(doc.deletedAt),
  };
}

const partnerOf = (room: ConversationDoc, userId: string) =>
  room.memberIds.find((id) => id !== userId) ?? userId;

const stateOf = (room: ConversationDoc, userId: string): ChatMemberState =>
  room.state?.[userId] ?? { unread: 0 };

/* -------------------------------------------------------------------------- */
/*                                Conversations                               */
/* -------------------------------------------------------------------------- */

/**
 * A chat the person is in, with the other person, as long as they still
 * share a company. Throws 404 otherwise: without a link the two can't see
 * each other.
 */
export async function requireConversation(
  userId: string,
  conversationId: string,
) {
  const { conversations } = await collections();
  const room = await conversations.findOne({
    _id: toObjectId(conversationId),
    memberIds: userId,
  });
  if (!room) throw new ChatError(404, 'Chat not found.');
  const partnerId = partnerOf(room, userId);
  const companies = await sharedCompanies(userId, partnerId);
  if (!companies.length) throw new ChatError(404, 'Chat not found.');
  return { room, partnerId, companies };
}

async function lastSeenOf(ids: string[]) {
  const { presence } = await collections();
  const docs = await presence.find({ _id: { $in: ids } }).toArray();
  return new Map(docs.map((d) => [d._id, d.lastSeenAt]));
}

async function conversationView(
  room: ConversationDoc,
  userId: string,
  {
    person,
    companies,
    lastMessage,
    lastSeenAt,
  }: {
    person?: ChatPerson;
    companies?: string[];
    lastMessage?: MessageDoc | null;
    lastSeenAt?: Date | null;
  },
): Promise<ChatConversation> {
  const partnerId = partnerOf(room, userId);
  const state = stateOf(room, userId);
  const cleared = state.clearedAt ? new Date(state.clearedAt) : null;
  const visibleLast =
    lastMessage &&
    !(lastMessage.hiddenFor ?? []).includes(userId) &&
    !(cleared && lastMessage.createdAt <= cleared)
      ? lastMessage
      : null;
  return {
    id: room._id.toHexString(),
    kind: 'direct',
    partner: {
      ...(person ?? { id: partnerId, name: 'Someone' }),
      companies: companies ?? [],
    },
    lastMessage: visibleLast ? toMessage(visibleLast) : null,
    lastMessageAt: iso(room.lastMessageAt),
    unread: state.unread ?? 0,
    muted: !!state.muted,
    pinned: !!state.pinned,
    archived: !!state.archived,
    partnerLastSeenAt: iso(lastSeenAt),
  };
}

/** The person's chats with people they still share a company with. */
export async function listConversations(userId: string) {
  const { conversations, messages } = await collections();
  const [rooms, contacts] = await Promise.all([
    conversations
      .find({ memberIds: userId, lastMessageAt: { $ne: null } })
      .sort({ lastMessageAt: -1 })
      .limit(500)
      .toArray(),
    contactsOf(userId),
  ]);
  const visible = rooms.filter((c) => contacts.has(partnerOf(c, userId)));
  const partnerIds = visible.map((c) => partnerOf(c, userId));
  const lastIds = visible
    .map((c) => c.lastMessageId)
    .filter((id): id is string => !!id && ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
  const [people, lastDocs, seen] = await Promise.all([
    peopleById(partnerIds),
    lastIds.length
      ? messages.find({ _id: { $in: lastIds } }).toArray()
      : Promise.resolve([] as MessageDoc[]),
    lastSeenOf(partnerIds),
  ]);
  const lastById = new Map(lastDocs.map((m) => [m._id.toHexString(), m]));
  return Promise.all(
    visible.map((c) => {
      const partnerId = partnerOf(c, userId);
      return conversationView(c, userId, {
        person: people.get(partnerId),
        companies: contacts.get(partnerId),
        lastMessage: c.lastMessageId ? lastById.get(c.lastMessageId) : null,
        lastSeenAt: seen.get(partnerId),
      });
    }),
  );
}

/** One chat, from the person's side. */
export async function getConversation(userId: string, conversationId: string) {
  const { room, partnerId, companies } = await requireConversation(
    userId,
    conversationId,
  );
  const { messages } = await collections();
  const [people, seen, last] = await Promise.all([
    peopleById([partnerId]),
    lastSeenOf([partnerId]),
    room.lastMessageId && ObjectId.isValid(room.lastMessageId)
      ? messages.findOne({ _id: new ObjectId(room.lastMessageId) })
      : Promise.resolve(null),
  ]);
  return conversationView(room, userId, {
    person: people.get(partnerId),
    companies,
    lastMessage: last,
    lastSeenAt: seen.get(partnerId),
  });
}

/** The chat between the person and someone they share a company with. */
export async function openDirectConversation(userId: string, otherId: string) {
  if (!otherId || otherId === userId)
    throw new ChatError(400, 'Pick someone to message.');
  const companies = await sharedCompanies(userId, otherId);
  if (!companies.length)
    throw new ChatError(
      403,
      'You can only message people who are in a company with you.',
    );
  const { conversations } = await collections();
  const memberIds = [userId, otherId].sort();
  const key = memberIds.join(':');
  const room = await conversations.findOneAndUpdate(
    { key },
    {
      $setOnInsert: {
        kind: 'direct',
        key,
        memberIds,
        state: { [userId]: { unread: 0 }, [otherId]: { unread: 0 } },
        lastMessageId: null,
        lastMessageAt: null,
        createdAt: new Date(),
      },
    },
    { upsert: true, returnDocument: 'after' },
  );
  if (!room) throw new ChatError(500, 'Could not open the chat.');
  return getConversation(userId, room._id.toHexString());
}

/** Mute, pin or archive a chat, for this person only. */
export async function updateConversationPrefs(
  userId: string,
  conversationId: string,
  prefs: { muted?: boolean; pinned?: boolean; archived?: boolean },
) {
  const { room } = await requireConversation(userId, conversationId);
  const { conversations } = await collections();
  const set: Record<string, boolean> = {};
  for (const key of ['muted', 'pinned', 'archived'] as const) {
    if (typeof prefs[key] === 'boolean')
      set[`state.${userId}.${key}`] = prefs[key]!;
  }
  if (Object.keys(set).length)
    await conversations.updateOne({ _id: room._id }, { $set: set });
  await publishToUsers([userId], { type: 'conversation', conversationId });
  return getConversation(userId, conversationId);
}

/** "Clear chat": hides every message so far, for this person only. */
export async function clearConversation(
  userId: string,
  conversationId: string,
) {
  const { room } = await requireConversation(userId, conversationId);
  const { conversations } = await collections();
  await conversations.updateOne(
    { _id: room._id },
    {
      $set: {
        [`state.${userId}.clearedAt`]: new Date().toISOString(),
        [`state.${userId}.unread`]: 0,
      },
    },
  );
  await publishToUsers([userId], { type: 'conversation', conversationId });
}

/* -------------------------------------------------------------------------- */
/*                                  Messages                                  */
/* -------------------------------------------------------------------------- */

const visibleTo = (userId: string, state: ChatMemberState) => ({
  hiddenFor: { $ne: userId },
  ...(state.clearedAt && { createdAt: { $gt: new Date(state.clearedAt) } }),
});

/** Messages in a chat, newest first, `limit` at a time before `before`. */
export async function listMessages(
  userId: string,
  conversationId: string,
  {
    before,
    limit = 40,
    mediaOnly = false,
  }: { before?: string | null; limit?: number; mediaOnly?: boolean } = {},
) {
  const { room } = await requireConversation(userId, conversationId);
  const { messages } = await collections();
  const filter: Record<string, unknown> = {
    conversationId,
    ...visibleTo(userId, stateOf(room, userId)),
  };
  if (mediaOnly) {
    filter['attachment.key'] = { $exists: true };
    filter.deletedAt = null;
  }
  if (before) {
    const date = new Date(before);
    if (!Number.isNaN(date.getTime())) {
      const created = (filter.createdAt as Record<string, Date>) ?? {};
      filter.createdAt = { ...created, $lt: date };
    }
  }
  const take = Math.min(Math.max(Number(limit) || 40, 1), 100);
  const docs = await messages
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(take + 1)
    .toArray();
  return {
    messages: docs.slice(0, take).map(toMessage),
    hasMore: docs.length > take,
  };
}

export interface SendInput {
  clientId: string;
  text?: string;
  attachment?: {
    key: string;
    name: string;
    mime: string;
    width?: number | null;
    height?: number | null;
    duration?: number | null;
    thumbKey?: string | null;
  } | null;
  replyToId?: string | null;
  /** Forward this message (its text and file) instead. */
  forwardOfId?: string | null;
}

const num = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null;

async function checkedAttachment(
  conversationId: string,
  input: NonNullable<SendInput['attachment']>,
): Promise<ChatAttachment> {
  const prefix = chatPrefix(conversationId);
  if (typeof input.key !== 'string' || !input.key.startsWith(prefix))
    throw new ChatError(400, 'That file belongs to another chat.');
  if (input.thumbKey && !String(input.thumbKey).startsWith(prefix))
    throw new ChatError(400, 'That preview belongs to another chat.');
  const size = await storedSize(input.key);
  if (size === null)
    throw new ChatError(400, 'The file did not finish uploading.');
  const mime = String(input.mime || 'application/octet-stream');
  const kind = kindOfMime(mime);
  const limit =
    kind === 'image' ? CHAT_LIMITS.maxImageBytes : CHAT_LIMITS.maxFileBytes;
  if (size > limit) {
    await deleteMedia([input.key, input.thumbKey ?? '']).catch(() => {});
    throw new ChatError(400, 'The file is too large.');
  }
  return {
    key: input.key,
    name: String(input.name || 'file').slice(0, 200),
    mime,
    size,
    width: num(input.width),
    height: num(input.height),
    duration: num(input.duration),
    thumbKey: input.thumbKey || null,
    expiredAt: null,
  };
}

/** Save a message, tell both people's browsers, and notify the other person. */
export async function sendMessage(
  userId: string,
  conversationId: string,
  input: SendInput,
): Promise<ChatMessage> {
  const { room, partnerId } = await requireConversation(userId, conversationId);
  const { conversations, messages } = await collections();

  const clientId = String(input.clientId || '').slice(0, 64);
  if (!clientId) throw new ChatError(400, 'Missing clientId.');
  const existing = await messages.findOne({ senderId: userId, clientId });
  if (existing) return toMessage(existing);

  let text = String(input.text ?? '').slice(0, CHAT_LIMITS.maxTextLength);
  let attachment: ChatAttachment | null = null;
  let forwarded = false;

  if (input.forwardOfId) {
    // Forwarding: copy a message from any chat the sender is in.
    const original = await messages.findOne({
      _id: toObjectId(input.forwardOfId),
      deletedAt: null,
    });
    if (!original) throw new ChatError(404, 'Message not found.');
    await requireConversation(userId, original.conversationId);
    text = original.text;
    attachment = original.attachment?.expiredAt
      ? null
      : (original.attachment ?? null);
    forwarded = true;
    if (!text.trim() && !attachment)
      throw new ChatError(400, 'That message can no longer be forwarded.');
  } else if (input.attachment) {
    attachment = await checkedAttachment(conversationId, input.attachment);
  }
  if (!text.trim() && !attachment) throw new ChatError(400, 'Type a message.');

  let replyTo: ChatReplyPreview | null = null;
  if (input.replyToId && ObjectId.isValid(input.replyToId)) {
    const quoted = await messages.findOne({
      _id: new ObjectId(input.replyToId),
      conversationId,
    });
    if (quoted && !quoted.deletedAt)
      replyTo = {
        id: quoted._id.toHexString(),
        senderId: quoted.senderId,
        kind: quoted.kind,
        text: previewText(quoted).slice(0, 200),
      };
  }

  const doc: MessageDoc = {
    _id: new ObjectId(),
    conversationId,
    senderId: userId,
    recipientIds: [partnerId],
    clientId,
    kind: attachment ? kindOfMime(attachment.mime) : 'text',
    text,
    attachment,
    replyTo,
    forwarded,
    reactions: [],
    createdAt: new Date(),
    editedAt: null,
    deliveredAt: null,
    readAt: null,
    deletedAt: null,
    hiddenFor: [],
  };
  try {
    await messages.insertOne(doc);
  } catch (error) {
    // The same send arrived twice at once; return the one that won.
    if ((error as { code?: number })?.code === 11000) {
      const saved = await messages.findOne({ senderId: userId, clientId });
      if (saved) return toMessage(saved);
    }
    throw error;
  }
  const updated = await conversations.findOneAndUpdate(
    { _id: room._id },
    {
      $set: {
        lastMessageId: doc._id.toHexString(),
        lastMessageAt: doc.createdAt,
      },
      $inc: { [`state.${partnerId}.unread`]: 1 },
    },
    { returnDocument: 'after' },
  );

  const message = toMessage(doc);
  const partnerState = updated ? stateOf(updated, partnerId) : { unread: 1 };
  await Promise.all([
    publishToUsers([partnerId, userId], {
      type: 'message',
      conversationId,
      message,
    }),
    partnerState.muted
      ? null
      : notifyNewMessage(
          userId,
          partnerId,
          conversationId,
          doc,
          partnerState.unread,
        ),
  ]);
  return message;
}

async function notifyNewMessage(
  senderId: string,
  recipientId: string,
  conversationId: string,
  doc: MessageDoc,
  unread: number,
) {
  try {
    const people = await peopleById([senderId]);
    const name = people.get(senderId)?.name || 'New message';
    await sendPushToUsers([recipientId], {
      title: unread > 1 ? `${name} (${unread} messages)` : name,
      body: previewText(doc).slice(0, 180),
      url: `/messages/${conversationId}`,
      tag: `chat-${conversationId}`,
      actions: [{ action: 'chat-read', title: 'Mark as read' }],
      chat: { conversationId, messageId: doc._id.toHexString() },
    });
  } catch (error) {
    console.error('[chat] push failed:', error);
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Ticks                                    */
/* -------------------------------------------------------------------------- */

/**
 * Two grey ticks: every message to this person that their browser has now
 * received (in one chat, or all of them). Senders are told live.
 */
export async function markDelivered(
  userId: string,
  { conversationId }: { conversationId?: string | null } = {},
) {
  const { messages } = await collections();
  const filter: Record<string, unknown> = {
    recipientIds: userId,
    deliveredAt: null,
  };
  if (conversationId) filter.conversationId = conversationId;
  const groups = await messages
    .aggregate<{
      _id: { conversationId: string; senderId: string };
      upTo: Date;
    }>([
      { $match: filter },
      {
        $group: {
          _id: { conversationId: '$conversationId', senderId: '$senderId' },
          upTo: { $max: '$createdAt' },
        },
      },
      { $limit: 500 },
    ])
    .toArray();
  if (!groups.length) return 0;
  const now = new Date();
  const result = await messages.updateMany(
    {
      ...filter,
      conversationId: { $in: groups.map((g) => g._id.conversationId) },
    },
    { $set: { deliveredAt: now } },
  );
  await Promise.all(
    groups.map((g) =>
      publishToUsers([g._id.senderId], {
        type: 'receipt',
        conversationId: g._id.conversationId,
        by: userId,
        status: 'delivered',
        upTo: g.upTo.toISOString(),
        at: now.toISOString(),
      }),
    ),
  );
  return result.modifiedCount;
}

/** Two blue ticks: the person has seen every message in the chat so far. */
export async function markRead(userId: string, conversationId: string) {
  const { room, partnerId } = await requireConversation(userId, conversationId);
  const { conversations, messages } = await collections();
  const now = new Date();
  const filter = {
    conversationId,
    recipientIds: userId,
    readAt: null,
    createdAt: { $lte: now },
  };
  const newest = await messages
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(1)
    .next();
  await conversations.updateOne(
    { _id: room._id },
    { $set: { [`state.${userId}.unread`]: 0 } },
  );
  if (!newest) return;
  await messages.updateMany(
    { ...filter, deliveredAt: null },
    {
      $set: { deliveredAt: now },
    },
  );
  await messages.updateMany(filter, { $set: { readAt: now } });
  await Promise.all([
    publishToUsers([partnerId], {
      type: 'receipt',
      conversationId,
      by: userId,
      status: 'read',
      upTo: newest.createdAt.toISOString(),
      at: now.toISOString(),
    }),
    // The person's other open devices clear the unread count too.
    publishToUsers([userId], { type: 'conversation', conversationId }),
  ]);
}

/** Total unread messages across chats the person can see, for the badge. */
export async function unreadSummary(userId: string) {
  const { conversations } = await collections();
  const [rooms, contacts] = await Promise.all([
    conversations
      .find(
        { memberIds: userId, [`state.${userId}.unread`]: { $gt: 0 } },
        { projection: { memberIds: 1, state: 1 } },
      )
      .toArray(),
    contactsOf(userId),
  ]);
  let unread = 0;
  let chats = 0;
  for (const c of rooms) {
    if (!contacts.has(partnerOf(c, userId))) continue;
    const state = stateOf(c, userId);
    if (state.archived || !state.unread) continue;
    unread += state.unread;
    chats += 1;
  }
  return { unread, chats };
}

/* -------------------------------------------------------------------------- */
/*                         Edit, delete and reactions                         */
/* -------------------------------------------------------------------------- */

async function requireMessage(userId: string, messageId: string) {
  const { messages } = await collections();
  const doc = await messages.findOne({ _id: toObjectId(messageId) });
  if (!doc) throw new ChatError(404, 'Message not found.');
  const { room, partnerId } = await requireConversation(
    userId,
    doc.conversationId,
  );
  return { doc, room, partnerId, messages };
}

async function broadcastUpdate(doc: MessageDoc, memberIds: string[]) {
  await publishToUsers(memberIds, {
    type: 'update',
    conversationId: doc.conversationId,
    message: toMessage(doc),
  });
}

/** Change a message's text (or a file's caption) within 15 minutes. */
export async function editMessage(
  userId: string,
  messageId: string,
  text: string,
) {
  const { doc, room, messages } = await requireMessage(userId, messageId);
  if (doc.senderId !== userId)
    throw new ChatError(403, 'You can only edit your own messages.');
  if (doc.deletedAt) throw new ChatError(400, 'This message was deleted.');
  if (Date.now() - doc.createdAt.getTime() > CHAT_LIMITS.editWindowMs)
    throw new ChatError(400, 'Messages can only be edited for 15 minutes.');
  const next = String(text ?? '').slice(0, CHAT_LIMITS.maxTextLength);
  if (!next.trim() && !doc.attachment)
    throw new ChatError(400, 'Type a message.');
  const updated = await messages.findOneAndUpdate(
    { _id: doc._id },
    { $set: { text: next, editedAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (updated) await broadcastUpdate(updated, room.memberIds);
  return updated ? toMessage(updated) : toMessage(doc);
}

/**
 * "Delete for me" hides a message for this person. "Delete for everyone"
 * (own messages, within 48 hours) replaces it with "This message was
 * deleted" and removes its file.
 */
export async function deleteMessage(
  userId: string,
  messageId: string,
  scope: 'me' | 'everyone',
) {
  const { doc, room, messages } = await requireMessage(userId, messageId);
  if (scope === 'me') {
    await messages.updateOne(
      { _id: doc._id },
      { $addToSet: { hiddenFor: userId } },
    );
    await publishToUsers([userId], {
      type: 'conversation',
      conversationId: doc.conversationId,
    });
    return null;
  }
  if (doc.senderId !== userId)
    throw new ChatError(
      403,
      'You can only delete your own messages for everyone.',
    );
  if (Date.now() - doc.createdAt.getTime() > CHAT_LIMITS.deleteWindowMs)
    throw new ChatError(400, 'It is too late to delete this for everyone.');
  const updated = await messages.findOneAndUpdate(
    { _id: doc._id },
    { $set: { deletedAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (doc.attachment && !doc.attachment.expiredAt) {
    // Keep the file while a forwarded copy still uses it.
    const others = await messages.countDocuments({
      _id: { $ne: doc._id },
      'attachment.key': doc.attachment.key,
      deletedAt: null,
    });
    if (!others)
      await deleteMedia([
        doc.attachment.key,
        doc.attachment.thumbKey ?? '',
      ]).catch((error) =>
        console.error('[chat] deleting media failed:', error),
      );
  }
  if (updated) await broadcastUpdate(updated, room.memberIds);
  return updated ? toMessage(updated) : null;
}

/** Set or remove (`emoji` empty) the person's reaction to a message. */
export async function reactToMessage(
  userId: string,
  messageId: string,
  emoji: string | null,
) {
  const { doc, room, messages } = await requireMessage(userId, messageId);
  if (doc.deletedAt) throw new ChatError(400, 'This message was deleted.');
  const value = String(emoji ?? '')
    .trim()
    .slice(0, 16);
  await messages.updateOne(
    { _id: doc._id },
    { $pull: { reactions: { userId } } },
  );
  if (value)
    await messages.updateOne(
      { _id: doc._id },
      { $push: { reactions: { userId, emoji: value } } },
    );
  const updated = await messages.findOne({ _id: doc._id });
  if (updated) await broadcastUpdate(updated, room.memberIds);
  return updated ? toMessage(updated) : toMessage(doc);
}

/** A message the person can see, for opening or downloading its file. */
export async function messageForMedia(userId: string, messageId: string) {
  const { doc, room } = await requireMessage(userId, messageId);
  const state = stateOf(room, userId);
  if (
    doc.deletedAt ||
    (doc.hiddenFor ?? []).includes(userId) ||
    (state.clearedAt && doc.createdAt <= new Date(state.clearedAt))
  )
    throw new ChatError(404, 'Message not found.');
  return doc;
}

/* -------------------------------------------------------------------------- */
/*                                   Search                                   */
/* -------------------------------------------------------------------------- */

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Messages containing `q`, in one chat or across all of the person's chats. */
export async function searchMessages(
  userId: string,
  q: string,
  conversationId?: string | null,
) {
  const query = String(q || '')
    .trim()
    .slice(0, 100);
  if (query.length < 2) return [];
  const { conversations, messages } = await collections();
  let rooms: ConversationDoc[];
  if (conversationId) {
    rooms = [(await requireConversation(userId, conversationId)).room];
  } else {
    const contacts = await contactsOf(userId);
    rooms = (await conversations.find({ memberIds: userId }).toArray()).filter(
      (c) => contacts.has(partnerOf(c, userId)),
    );
  }
  if (!rooms.length) return [];
  const regex = new RegExp(escapeRegex(query), 'i');
  const docs = await messages
    .find({
      $or: rooms.map((c) => ({
        conversationId: c._id.toHexString(),
        ...visibleTo(userId, stateOf(c, userId)),
      })),
      deletedAt: null,
      $and: [{ $or: [{ text: regex }, { 'attachment.name': regex }] }],
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  return docs.map(toMessage);
}

/* -------------------------------------------------------------------------- */
/*                                 Last seen                                  */
/* -------------------------------------------------------------------------- */

/** Remember that the person is in the portal now, for "last seen". */
export async function touchLastSeen(userId: string) {
  const { presence } = await collections();
  await presence.updateOne(
    { _id: userId },
    { $set: { lastSeenAt: new Date() } },
    { upsert: true },
  );
}

/* -------------------------------------------------------------------------- */
/*                               Media cleanup                                */
/* -------------------------------------------------------------------------- */

/**
 * Photos, videos and files older than 90 days are removed from Spaces; their
 * messages stay and show that the file has expired. Runs daily (vercel.json).
 */
export async function cleanupOldMedia({ batch = 500 } = {}) {
  const { messages } = await collections();
  const cutoff = new Date(
    Date.now() - CHAT_LIMITS.mediaRetentionDays * 24 * 60 * 60 * 1000,
  );
  let removed = 0;
  for (let round = 0; round < 20; round++) {
    const docs = await messages
      .find({
        createdAt: { $lt: cutoff },
        'attachment.key': { $exists: true },
        'attachment.expiredAt': null,
      })
      .sort({ createdAt: 1 })
      .limit(batch)
      .toArray();
    if (!docs.length) break;
    const keys = docs.flatMap((d) => [
      d.attachment!.key,
      d.attachment!.thumbKey ?? '',
    ]);
    await deleteMedia(keys);
    const at = new Date().toISOString();
    // Forwarded copies share the file, so they expire with it.
    const result = await messages.updateMany(
      { 'attachment.key': { $in: docs.map((d) => d.attachment!.key) } },
      { $set: { 'attachment.expiredAt': at } },
    );
    removed += result.modifiedCount;
    if (docs.length < batch) break;
  }
  return { removed };
}
