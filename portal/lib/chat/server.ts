import { ObjectId } from 'mongodb';

import { getMongoDb } from '@/lib/db/mongoose';
import { db } from '@/lib/mongodb/db-client';
import { sortByRecentPoints } from '@/lib/progress/myPoints';
import { sendPushToUsers } from '@/lib/push/server';
import { projectLabel } from '@/lib/workspace/projectLabel';
import {
  CHAT_LIMITS,
  type ChatAttachment,
  type ChatConversation,
  type ChatConversationKind,
  type ChatGroupInfo,
  type ChatKind,
  type ChatMemberState,
  type ChatMessage,
  type ChatPerson,
  type ChatReplyPreview,
  type ChatSystemNote,
} from '@/models/chat';
import type { Company, CompanyMember, Project } from '@/models/workspace';
import { COMPANY_STATUS, MEMBER_STATUS } from '@/models/workspace';

import { publishToUsers } from './realtime';
import { chatPrefix, deleteMedia, kindOfMime, storedSize } from './storage';

/*
 * Direct messages, groups and project groups. See models/chat.ts for the
 * shapes and the rules.
 *
 * Collections (raw MongoDB, ids kept as strings):
 *   ChatConversation  one per chat. `key` is "<idA>:<idB>" sorted for a
 *                     direct chat, "group:<id>" for a group and
 *                     "project:<projectId>" for a project's group.
 *   ChatMessage       one per message, newest read first by conversation.
 *   ChatPresence      each person's last time in the portal ("last seen").
 */

type ConversationDoc = {
  _id: ObjectId;
  /** Missing on chats made before groups: those are direct. */
  kind?: ChatConversationKind;
  key: string;
  memberIds: string[];
  state: Record<string, ChatMemberState>;
  /** Groups: the name and photo. Project groups use the project's. */
  name?: string | null;
  avatar?: string | null;
  description?: string | null;
  adminIds?: string[];
  createdById?: string | null;
  projectId?: string | null;
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
  system?: ChatSystemNote | null;
  reactions: { userId: string; emoji: string }[];
  createdAt: Date;
  editedAt?: Date | null;
  /** Set once every recipient's device has it. */
  deliveredAt?: Date | null;
  /** Set once every recipient has seen it. */
  readAt?: Date | null;
  /** Recipients whose device has it, and who have seen it (groups). */
  deliveredTo?: string[];
  readBy?: string[];
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
/*                                Project teams                               */
/* -------------------------------------------------------------------------- */

type ProjectBrief = Pick<
  Project,
  'id' | 'name' | 'logo' | 'companyId' | 'isCore' | 'leadIds' | 'memberIds'
>;

const PROJECT_FIELDS = {
  id: true,
  name: true,
  logo: true,
  companyId: true,
  isCore: true,
  leadIds: true,
  memberIds: true,
} as const;

/** The people in a company now. */
async function companyPeople(companyId: string) {
  const members: CompanyMember[] = await db.companyMember.findMany({
    where: { companyId, status: MEMBER_STATUS.ACTIVE },
    select: { userId: true },
  });
  return members.map((m) => m.userId).filter(Boolean);
}

/**
 * A project and its team: its leads and members, or everyone in the
 * company for the company's CORE project. Null when the project is gone.
 */
async function projectTeam(projectId: string) {
  const project: ProjectBrief | null = await db.project.findUnique({
    where: { id: projectId },
    select: PROJECT_FIELDS,
  });
  if (!project) return null;
  const ids = project.isCore
    ? await companyPeople(project.companyId)
    : [...(project.leadIds ?? []), ...(project.memberIds ?? [])];
  return { project, memberIds: Array.from(new Set(ids.filter(Boolean))) };
}

/** The projects whose team the person is on, by id. */
async function projectsOf(userId: string) {
  const mine: CompanyMember[] = await db.companyMember.findMany({
    where: { userId, status: MEMBER_STATUS.ACTIVE },
    select: { companyId: true },
  });
  const companyIds = Array.from(new Set(mine.map((m) => m.companyId)));
  const projects: ProjectBrief[] = await db.project.findMany({
    where: {
      OR: [
        { leadIds: { has: userId } },
        { memberIds: { has: userId } },
        ...(companyIds.length
          ? [{ isCore: true, companyId: { in: companyIds } }]
          : []),
      ],
    },
    select: PROJECT_FIELDS,
  });
  return new Map(projects.map((p) => [p.id, p]));
}

async function companyNames(ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return new Map<string, string>();
  const found: Company[] = await db.company.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true },
  });
  return new Map(found.map((c) => [c.id, c.name]));
}

/* -------------------------------------------------------------------------- */
/*                                  Mapping                                   */
/* -------------------------------------------------------------------------- */

const PREVIEW_OF_KIND: Record<ChatKind, string> = {
  text: '',
  image: 'Photo',
  video: 'Video',
  file: 'File',
  system: '',
};

const listNames = (names: string[]) =>
  names.length <= 1
    ? names[0] || 'someone'
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/** "Asha added Ravi", from the actor's or anyone else's side. */
export function systemLine(
  note: ChatSystemNote,
  { actor, targets }: { actor?: string; targets?: string[] } = {},
) {
  const who = actor ?? note.actorName;
  const them = listNames(targets ?? note.targetNames ?? []);
  switch (note.action) {
    case 'created':
      return note.name
        ? `${who} created the group “${note.name}”`
        : `${who} started the group`;
    case 'added':
      return `${who} added ${them}`;
    case 'removed':
      return `${who} removed ${them}`;
    case 'left':
      return `${who} left`;
    case 'renamed':
      return `${who} renamed the group to “${note.name ?? ''}”`;
    case 'photo':
      return `${who} changed the group photo`;
    case 'admin':
      return `${who} made ${them} an admin`;
  }
}

/** One line describing a message, for notifications and replies. */
export const previewText = (
  m: Pick<MessageDoc, 'kind' | 'text' | 'attachment'> &
    Partial<Pick<MessageDoc, 'system'>>,
) => {
  const text = (m.text || '').replace(/\s+/g, ' ').trim();
  if (m.kind === 'system')
    return 'system' in m && m.system ? systemLine(m.system) : text;
  if (m.kind === 'text') return text;
  const label =
    m.kind === 'file' ? m.attachment?.name || 'File' : PREVIEW_OF_KIND[m.kind];
  return text ? `${label}: ${text}` : label;
};

function toMessage(doc: MessageDoc): ChatMessage {
  const deleted = !!doc.deletedAt;
  const recipients = doc.recipientIds?.length ?? 0;
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
    system: doc.system ?? null,
    reactions: deleted ? [] : (doc.reactions ?? []),
    createdAt: doc.createdAt.toISOString(),
    editedAt: iso(doc.editedAt),
    deliveredAt: iso(doc.deliveredAt),
    readAt: iso(doc.readAt),
    deletedAt: iso(doc.deletedAt),
    ...(recipients > 1 && {
      readCount: doc.readAt ? recipients : (doc.readBy?.length ?? 0),
      recipientCount: recipients,
    }),
  };
}

const kindOf = (room: Pick<ConversationDoc, 'kind'>): ChatConversationKind =>
  room.kind ?? 'direct';

const isGroup = (room: Pick<ConversationDoc, 'kind'>) =>
  kindOf(room) !== 'direct';

const partnerOf = (room: ConversationDoc, userId: string) =>
  room.memberIds.find((id) => id !== userId) ?? userId;

/** Everyone in the chat but the person. */
const othersIn = (room: ConversationDoc, userId: string) =>
  room.memberIds.filter((id) => id !== userId);

const stateOf = (room: ConversationDoc, userId: string): ChatMemberState =>
  room.state?.[userId] ?? { unread: 0 };

/* -------------------------------------------------------------------------- */
/*                                Conversations                               */
/* -------------------------------------------------------------------------- */

/**
 * Brings a project group's members in line with the project's team: people
 * who joined the team are added (and see the whole history), people who
 * left it are taken out. Returns the room as it is now, or null when the
 * project is gone.
 */
async function syncProjectGroup(room: ConversationDoc) {
  if (kindOf(room) !== 'project' || !room.projectId) return null;
  const team = await projectTeam(room.projectId);
  if (!team) return null;
  const want = team.memberIds;
  const have = new Set(room.memberIds);
  const same =
    want.length === room.memberIds.length && want.every((id) => have.has(id));
  if (same) return { room, project: team.project };
  const { conversations, messages } = await collections();
  const joined = want.filter((id) => !have.has(id));
  const left = room.memberIds.filter((id) => !want.includes(id));
  const set: Record<string, unknown> = { memberIds: want };
  for (const id of joined)
    if (!room.state?.[id]) set[`state.${id}`] = { unread: 0 };
  const updated = await conversations.findOneAndUpdate(
    { _id: room._id },
    { $set: set },
    { returnDocument: 'after' },
  );
  if (left.length) await settleReceipts(room._id.toHexString(), left, messages);
  if (joined.length || left.length)
    await publishToUsers([...joined, ...left], {
      type: 'conversation',
      conversationId: room._id.toHexString(),
    });
  return {
    room: updated ?? { ...room, memberIds: want },
    project: team.project,
  };
}

/**
 * People who left a group no longer count for ticks: once everyone still
 * in it has a message, it shows as delivered or read.
 */
async function settleReceipts(
  conversationId: string,
  leftIds: string[],
  messages?: Awaited<ReturnType<typeof collections>>['messages'],
) {
  const col = messages ?? (await collections()).messages;
  await col.updateMany(
    { conversationId, readAt: null, recipientIds: { $in: leftIds } },
    { $pull: { recipientIds: { $in: leftIds } } },
  );
  const now = new Date();
  await col.updateMany(
    {
      conversationId,
      deliveredAt: null,
      $expr: {
        $setIsSubset: ['$recipientIds', { $ifNull: ['$deliveredTo', []] }],
      },
    },
    { $set: { deliveredAt: now } },
  );
  await col.updateMany(
    {
      conversationId,
      readAt: null,
      $expr: {
        $setIsSubset: ['$recipientIds', { $ifNull: ['$readBy', []] }],
      },
    },
    { $set: { readAt: now } },
  );
}

/**
 * A chat the person is in. A direct chat needs the two to still share a
 * company; a project group needs the person on the project's team. Throws
 * 404 otherwise: without a link they can't see it.
 */
export async function requireConversation(
  userId: string,
  conversationId: string,
) {
  const { conversations } = await collections();
  let room = await conversations.findOne({ _id: toObjectId(conversationId) });
  if (!room) throw new ChatError(404, 'Chat not found.');
  let project: ProjectBrief | null = null;
  if (kindOf(room) === 'project') {
    const synced = await syncProjectGroup(room);
    if (!synced) throw new ChatError(404, 'Chat not found.');
    room = synced.room;
    project = synced.project;
  }
  if (!room.memberIds.includes(userId))
    throw new ChatError(404, 'Chat not found.');
  if (isGroup(room))
    return {
      room,
      partnerId: null as string | null,
      companies: [] as string[],
      project,
    };
  const partnerId = partnerOf(room, userId);
  const companies = await sharedCompanies(userId, partnerId);
  if (!companies.length) throw new ChatError(404, 'Chat not found.');
  return { room, partnerId: partnerId as string | null, companies, project };
}

async function lastSeenOf(ids: string[]) {
  const { presence } = await collections();
  const docs = await presence.find({ _id: { $in: ids } }).toArray();
  return new Map(docs.map((d) => [d._id, d.lastSeenAt]));
}

/** The first message the person can see in the chat. */
const visibleSince = (room: ConversationDoc, state: ChatMemberState) => {
  const dates = [state.clearedAt];
  // Someone added to a group sees from when they joined; a project group
  // shows its whole history to everyone on the team.
  if (kindOf(room) === 'group') dates.push(state.joinedAt);
  const times = dates
    .filter((d): d is string => !!d)
    .map((d) => new Date(d).getTime())
    .filter((t) => !Number.isNaN(t));
  return times.length ? new Date(Math.max(...times)) : null;
};

const byName = (a: ChatPerson, b: ChatPerson) =>
  (a.name || '').localeCompare(b.name || '');

function groupInfo(
  room: ConversationDoc,
  userId: string,
  people: Map<string, ChatPerson>,
  project?: ProjectBrief | null,
  companyName?: string | null,
): ChatGroupInfo {
  const forProject = kindOf(room) === 'project';
  const adminIds = room.adminIds ?? [];
  return {
    // A core project's group is named after its company.
    name: forProject
      ? (project && projectLabel(project, companyName)) ||
        room.name ||
        'Project'
      : room.name || 'Group',
    avatar: forProject ? (project?.logo ?? null) : (room.avatar ?? null),
    description: room.description ?? null,
    members: room.memberIds
      .map((id) => people.get(id) ?? { id, name: 'Someone' })
      .sort(byName),
    adminIds: forProject ? [] : adminIds,
    createdById: room.createdById ?? null,
    projectId: room.projectId ?? null,
    companyName: companyName ?? null,
    canManage: !forProject && adminIds.includes(userId),
  };
}

async function conversationView(
  room: ConversationDoc,
  userId: string,
  {
    person,
    companies,
    lastMessage,
    lastSeenAt,
    people,
    project,
    companyName,
  }: {
    person?: ChatPerson;
    companies?: string[];
    lastMessage?: MessageDoc | null;
    lastSeenAt?: Date | null;
    /** Groups: everyone in it. */
    people?: Map<string, ChatPerson>;
    project?: ProjectBrief | null;
    companyName?: string | null;
  },
): Promise<ChatConversation> {
  const id = room._id.toHexString();
  const state = stateOf(room, userId);
  const since = visibleSince(room, state);
  const visibleLast =
    lastMessage &&
    !(lastMessage.hiddenFor ?? []).includes(userId) &&
    !(since && lastMessage.createdAt <= since)
      ? lastMessage
      : null;
  const group = isGroup(room)
    ? groupInfo(room, userId, people ?? new Map(), project, companyName)
    : null;
  const partnerId = partnerOf(room, userId);
  return {
    id,
    kind: kindOf(room),
    partner: group
      ? { id: `group:${id}`, name: group.name, avatar: group.avatar }
      : {
          ...(person ?? { id: partnerId, name: 'Someone' }),
          companies: companies ?? [],
        },
    group,
    lastMessage: visibleLast ? toMessage(visibleLast) : null,
    lastMessageAt: iso(room.lastMessageAt),
    unread: state.unread ?? 0,
    muted: !!state.muted,
    pinned: !!state.pinned,
    archived: !!state.archived,
    partnerLastSeenAt: group ? null : iso(lastSeenAt),
  };
}

/**
 * The person's chats: direct chats with people they still share a company
 * with, their groups, and the groups of projects they are on.
 */
export async function listConversations(userId: string) {
  const { conversations, messages } = await collections();
  const [contacts, myProjects] = await Promise.all([
    contactsOf(userId),
    projectsOf(userId),
  ]);
  const rooms = await conversations
    .find({
      $or: [
        { memberIds: userId },
        { kind: 'project', projectId: { $in: Array.from(myProjects.keys()) } },
      ],
      lastMessageAt: { $ne: null },
    })
    .sort({ lastMessageAt: -1 })
    .limit(500)
    .toArray();

  // Project groups follow the project's team: join the ones the person is
  // now on, leave the ones they no longer are.
  const visible: ConversationDoc[] = [];
  for (const room of rooms) {
    const kind = kindOf(room);
    if (kind === 'direct') {
      if (contacts.has(partnerOf(room, userId))) visible.push(room);
      continue;
    }
    if (kind === 'group') {
      visible.push(room);
      continue;
    }
    const onTeam = !!room.projectId && myProjects.has(room.projectId);
    const listed = room.memberIds.includes(userId);
    if (onTeam !== listed) {
      const synced = await syncProjectGroup(room);
      if (synced?.room.memberIds.includes(userId)) visible.push(synced.room);
    } else if (onTeam) visible.push(room);
  }

  const partnerIds = visible
    .filter((c) => !isGroup(c))
    .map((c) => partnerOf(c, userId));
  const memberIds = visible.filter(isGroup).flatMap((c) => c.memberIds);
  const lastIds = visible
    .map((c) => c.lastMessageId)
    .filter((id): id is string => !!id && ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
  const companyIds = Array.from(myProjects.values()).map((p) => p.companyId);
  const [people, lastDocs, seen, companies] = await Promise.all([
    peopleById([...partnerIds, ...memberIds]),
    lastIds.length
      ? messages.find({ _id: { $in: lastIds } }).toArray()
      : Promise.resolve([] as MessageDoc[]),
    lastSeenOf(partnerIds),
    companyNames(companyIds),
  ]);
  const lastById = new Map(lastDocs.map((m) => [m._id.toHexString(), m]));
  return Promise.all(
    visible.map((c) => {
      const partnerId = partnerOf(c, userId);
      const project = c.projectId ? myProjects.get(c.projectId) : null;
      return conversationView(c, userId, {
        person: people.get(partnerId),
        companies: contacts.get(partnerId),
        lastMessage: c.lastMessageId ? lastById.get(c.lastMessageId) : null,
        lastSeenAt: seen.get(partnerId),
        people,
        project,
        companyName: project ? companies.get(project.companyId) : null,
      });
    }),
  );
}

/** One chat, from the person's side. */
export async function getConversation(userId: string, conversationId: string) {
  const { room, partnerId, companies, project } = await requireConversation(
    userId,
    conversationId,
  );
  const { messages } = await collections();
  const ids = partnerId ? [partnerId] : room.memberIds;
  const [people, seen, last, names] = await Promise.all([
    peopleById(ids),
    partnerId ? lastSeenOf([partnerId]) : Promise.resolve(new Map()),
    room.lastMessageId && ObjectId.isValid(room.lastMessageId)
      ? messages.findOne({ _id: new ObjectId(room.lastMessageId) })
      : Promise.resolve(null),
    project ? companyNames([project.companyId]) : Promise.resolve(new Map()),
  ]);
  return conversationView(room, userId, {
    person: partnerId ? people.get(partnerId) : undefined,
    companies,
    lastMessage: last,
    lastSeenAt: partnerId ? seen.get(partnerId) : null,
    people,
    project,
    companyName: project ? names.get(project.companyId) : null,
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

/* -------------------------------------------------------------------------- */
/*                                   Groups                                   */
/* -------------------------------------------------------------------------- */

const cleanName = (value: unknown) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CHAT_LIMITS.maxGroupNameLength);

/** A group photo is a link to an image; anything else is dropped. */
const cleanAvatar = (value: unknown) => {
  const url = String(value ?? '').trim();
  return /^https:\/\/\S+$/i.test(url) ? url.slice(0, 1000) : null;
};

const nameOf = async (ids: string[]) => {
  const people = await peopleById(ids);
  return ids.map((id) => people.get(id)?.name || 'Someone');
};

/**
 * Adds a line like "Asha added Ravi" to a group. It is not counted as
 * unread and sends no notification.
 */
async function postSystem(
  room: ConversationDoc,
  actorId: string,
  note: Omit<ChatSystemNote, 'actorName'>,
  { alsoTell = [] as string[] } = {},
) {
  const { conversations, messages } = await collections();
  const [actorName] = await nameOf([actorId]);
  const targetNames = note.targetIds?.length
    ? await nameOf(note.targetIds)
    : undefined;
  const system: ChatSystemNote = { ...note, actorName, targetNames };
  const now = new Date();
  const doc: MessageDoc = {
    _id: new ObjectId(),
    conversationId: room._id.toHexString(),
    senderId: actorId,
    recipientIds: [],
    clientId: `sys:${new ObjectId().toHexString()}`,
    kind: 'system',
    text: systemLine(system),
    system,
    reactions: [],
    createdAt: now,
    deliveredAt: now,
    readAt: now,
    deletedAt: null,
    hiddenFor: [],
  };
  await messages.insertOne(doc);
  await conversations.updateOne(
    { _id: room._id },
    {
      $set: { lastMessageId: doc._id.toHexString(), lastMessageAt: now },
    },
  );
  await publishToUsers([...room.memberIds, ...alsoTell], {
    type: 'message',
    conversationId: doc.conversationId,
    message: toMessage(doc),
  });
}

/** The group as a group admin may change it. */
async function requireGroupAdmin(userId: string, conversationId: string) {
  const { room } = await requireConversation(userId, conversationId);
  if (kindOf(room) === 'project')
    throw new ChatError(
      403,
      "A project's group follows the project: change its team, name or logo on the project.",
    );
  if (kindOf(room) !== 'group')
    throw new ChatError(400, 'This is not a group.');
  if (!(room.adminIds ?? []).includes(userId))
    throw new ChatError(403, 'Only group admins can do that.');
  return room;
}

/** People the person may add to a group: everyone in their companies. */
async function checkedNewMembers(userId: string, ids: unknown) {
  const list = Array.isArray(ids) ? ids.map(String) : [];
  const contacts = await contactsOf(userId);
  const wanted = Array.from(new Set(list)).filter((id) => id !== userId);
  const outside = wanted.filter((id) => !contacts.has(id));
  if (outside.length)
    throw new ChatError(
      403,
      'You can only add people who are in a company with you.',
    );
  return wanted;
}

/** Start a group with people from the person's companies. */
export async function createGroup(
  userId: string,
  input: { name?: unknown; memberIds?: unknown; avatar?: unknown },
) {
  const name = cleanName(input.name);
  if (!name) throw new ChatError(400, 'Give the group a name.');
  const others = await checkedNewMembers(userId, input.memberIds);
  if (!others.length) throw new ChatError(400, 'Add at least one person.');
  const memberIds = [userId, ...others];
  if (memberIds.length > CHAT_LIMITS.maxGroupMembers)
    throw new ChatError(
      400,
      `A group can have up to ${CHAT_LIMITS.maxGroupMembers} people.`,
    );
  const { conversations } = await collections();
  const _id = new ObjectId();
  // A moment early, so the note about them joining is theirs to see.
  const joinedAt = new Date(Date.now() - 1000).toISOString();
  const room: ConversationDoc = {
    _id,
    kind: 'group',
    key: `group:${_id.toHexString()}`,
    memberIds,
    state: Object.fromEntries(
      memberIds.map((id) => [id, { unread: 0, joinedAt }]),
    ),
    name,
    avatar: cleanAvatar(input.avatar),
    description: null,
    adminIds: [userId],
    createdById: userId,
    lastMessageId: null,
    lastMessageAt: null,
    createdAt: new Date(),
  };
  await conversations.insertOne(room);
  await postSystem(room, userId, { action: 'created', name });
  return getConversation(userId, _id.toHexString());
}

/**
 * The project's group, started the first time anyone on its team opens it.
 * Its members are the project's team and its whole history is shared.
 */
export async function openProjectGroup(userId: string, projectId: string) {
  const team = projectId ? await projectTeam(projectId) : null;
  if (!team) throw new ChatError(404, 'Project not found.');
  if (!team.memberIds.includes(userId))
    throw new ChatError(
      403,
      "Only people on the project's team are in its group.",
    );
  const { conversations } = await collections();
  const key = `project:${projectId}`;
  const now = new Date();
  const existing = await conversations.findOne({ key });
  if (existing) {
    await requireConversation(userId, existing._id.toHexString());
    return getConversation(userId, existing._id.toHexString());
  }
  try {
    const room: ConversationDoc = {
      _id: new ObjectId(),
      kind: 'project',
      key,
      projectId,
      memberIds: team.memberIds,
      state: Object.fromEntries(
        team.memberIds.map((id) => [id, { unread: 0 }]),
      ),
      name: team.project.name,
      avatar: null,
      adminIds: [],
      createdById: userId,
      lastMessageId: null,
      lastMessageAt: null,
      createdAt: now,
    };
    await conversations.insertOne(room);
    await postSystem(room, userId, { action: 'created' });
    return getConversation(userId, room._id.toHexString());
  } catch (error) {
    // Two people opened it at once; use the one that was saved.
    if ((error as { code?: number })?.code === 11000) {
      const saved = await conversations.findOne({ key });
      if (saved) return getConversation(userId, saved._id.toHexString());
    }
    throw error;
  }
}

/** Rename a group or change its photo (group admins). */
export async function updateGroup(
  userId: string,
  conversationId: string,
  input: { name?: unknown; avatar?: unknown },
) {
  const room = await requireGroupAdmin(userId, conversationId);
  const { conversations } = await collections();
  const set: Record<string, unknown> = {};
  const notes: Omit<ChatSystemNote, 'actorName'>[] = [];
  if (input.name !== undefined) {
    const name = cleanName(input.name);
    if (!name) throw new ChatError(400, 'Give the group a name.');
    if (name !== room.name) {
      set.name = name;
      notes.push({ action: 'renamed', name });
    }
  }
  if (input.avatar !== undefined) {
    const avatar = cleanAvatar(input.avatar);
    if (avatar !== (room.avatar ?? null)) {
      set.avatar = avatar;
      notes.push({ action: 'photo' });
    }
  }
  if (Object.keys(set).length) {
    await conversations.updateOne({ _id: room._id }, { $set: set });
    const next = { ...room, ...set } as ConversationDoc;
    for (const note of notes) await postSystem(next, userId, note);
  }
  return getConversation(userId, conversationId);
}

/** Add people to a group (group admins). They see messages from now on. */
export async function addGroupMembers(
  userId: string,
  conversationId: string,
  ids: unknown,
) {
  const room = await requireGroupAdmin(userId, conversationId);
  const wanted = (await checkedNewMembers(userId, ids)).filter(
    (id) => !room.memberIds.includes(id),
  );
  if (!wanted.length) return getConversation(userId, conversationId);
  if (room.memberIds.length + wanted.length > CHAT_LIMITS.maxGroupMembers)
    throw new ChatError(
      400,
      `A group can have up to ${CHAT_LIMITS.maxGroupMembers} people.`,
    );
  const { conversations } = await collections();
  // A moment early, so the note about them joining is theirs to see.
  const joinedAt = new Date(Date.now() - 1000).toISOString();
  const set: Record<string, unknown> = {};
  for (const id of wanted)
    set[`state.${id}`] = { unread: 0, joinedAt, clearedAt: null };
  const updated = await conversations.findOneAndUpdate(
    { _id: room._id },
    { $addToSet: { memberIds: { $each: wanted } }, $set: set },
    { returnDocument: 'after' },
  );
  await postSystem(updated ?? room, userId, {
    action: 'added',
    targetIds: wanted,
  });
  return getConversation(userId, conversationId);
}

/**
 * Take someone out of a group (group admins), or leave it (`targetId` is
 * the person). The last admin to leave hands the group to someone else.
 */
export async function removeGroupMember(
  userId: string,
  conversationId: string,
  targetId: string,
) {
  const leaving = targetId === userId;
  const room = leaving
    ? (await requireConversation(userId, conversationId)).room
    : await requireGroupAdmin(userId, conversationId);
  if (kindOf(room) === 'project')
    throw new ChatError(
      403,
      "You're in this group while you're on the project's team.",
    );
  if (kindOf(room) !== 'group')
    throw new ChatError(400, 'This is not a group.');
  if (!room.memberIds.includes(targetId))
    throw new ChatError(404, 'They are not in this group.');
  const { conversations, messages } = await collections();
  const memberIds = room.memberIds.filter((id) => id !== targetId);
  let adminIds = (room.adminIds ?? []).filter((id) => id !== targetId);
  if (!adminIds.length && memberIds.length) adminIds = [memberIds[0]];
  await conversations.updateOne(
    { _id: room._id },
    {
      $set: {
        memberIds,
        adminIds,
        [`state.${targetId}.unread`]: 0,
      },
    },
  );
  await settleReceipts(conversationId, [targetId], messages);
  await postSystem(
    { ...room, memberIds },
    userId,
    leaving ? { action: 'left' } : { action: 'removed', targetIds: [targetId] },
    { alsoTell: [targetId] },
  );
  // Their chats list drops the group.
  await publishToUsers([targetId], { type: 'conversation', conversationId });
  if (leaving) return null;
  return getConversation(userId, conversationId);
}

/** Make someone in the group an admin too (group admins). */
export async function makeGroupAdmin(
  userId: string,
  conversationId: string,
  targetId: string,
) {
  const room = await requireGroupAdmin(userId, conversationId);
  if (!room.memberIds.includes(targetId))
    throw new ChatError(404, 'They are not in this group.');
  if (!(room.adminIds ?? []).includes(targetId)) {
    const { conversations } = await collections();
    await conversations.updateOne(
      { _id: room._id },
      { $addToSet: { adminIds: targetId } },
    );
    await postSystem(room, userId, { action: 'admin', targetIds: [targetId] });
  }
  return getConversation(userId, conversationId);
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

const visibleTo = (room: ConversationDoc, userId: string) => {
  const since = visibleSince(room, stateOf(room, userId));
  return {
    hiddenFor: { $ne: userId },
    ...(since && { createdAt: { $gt: since } }),
  };
};

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
    ...visibleTo(room, userId),
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
  const { room } = await requireConversation(userId, conversationId);
  const { conversations, messages } = await collections();
  const recipientIds = othersIn(room, userId);

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
    if (!original || original.kind === 'system')
      throw new ChatError(404, 'Message not found.');
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
    if (quoted && !quoted.deletedAt && quoted.kind !== 'system')
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
    recipientIds,
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
    deliveredTo: [],
    readBy: [],
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
      ...(recipientIds.length && {
        $inc: Object.fromEntries(
          recipientIds.map((id) => [`state.${id}.unread`, 1]),
        ),
      }),
    },
    { returnDocument: 'after' },
  );

  const message = toMessage(doc);
  const after = updated ?? room;
  await Promise.all([
    publishToUsers([...recipientIds, userId], {
      type: 'message',
      conversationId,
      message,
    }),
    notifyNewMessage(after, userId, recipientIds, doc),
  ]);
  return message;
}

async function notifyNewMessage(
  room: ConversationDoc,
  senderId: string,
  recipientIds: string[],
  doc: MessageDoc,
) {
  try {
    const conversationId = room._id.toHexString();
    const listening = recipientIds.filter((id) => !stateOf(room, id).muted);
    if (!listening.length) return;
    const people = await peopleById([senderId]);
    const sender = people.get(senderId)?.name || 'New message';
    let groupName: string | null = null;
    if (isGroup(room)) {
      groupName = room.name || 'Group';
      if (kindOf(room) === 'project' && room.projectId) {
        const team = await projectTeam(room.projectId);
        const names = team
          ? await companyNames([team.project.companyId])
          : new Map<string, string>();
        groupName =
          (team &&
            projectLabel(team.project, names.get(team.project.companyId))) ||
          groupName;
      }
    }
    const body = previewText(doc).slice(0, 180);
    // Each person sees their own unread count in the title.
    const byCount = new Map<number, string[]>();
    for (const id of listening) {
      const unread = stateOf(room, id).unread ?? 1;
      byCount.set(unread, [...(byCount.get(unread) ?? []), id]);
    }
    await Promise.all(
      Array.from(byCount.entries()).map(([unread, ids]) => {
        const name = groupName ?? sender;
        return sendPushToUsers(ids, {
          title: unread > 1 ? `${name} (${unread} messages)` : name,
          body: groupName ? `${sender}: ${body}` : body,
          url: `/messages/${conversationId}`,
          tag: `chat-${conversationId}`,
          actions: [{ action: 'chat-read', title: 'Mark as read' }],
          chat: { conversationId, messageId: doc._id.toHexString() },
        });
      }),
    );
  } catch (error) {
    console.error('[chat] push failed:', error);
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Ticks                                    */
/* -------------------------------------------------------------------------- */

/** Messages whose recipients all have them (or have seen them) now. */
const allOf = (field: 'deliveredTo' | 'readBy') => ({
  $expr: {
    $setIsSubset: ['$recipientIds', { $ifNull: [`$${field}`, []] }],
  },
});

/**
 * Tells senders which of their messages have just reached everyone (or
 * been seen by everyone): the ones stamped `at`.
 */
async function announceReceipts(
  conversationIds: string[],
  by: string,
  status: 'delivered' | 'read',
  at: Date,
) {
  const { messages } = await collections();
  const field = status === 'read' ? 'readAt' : 'deliveredAt';
  const groups = await messages
    .aggregate<{
      _id: { conversationId: string; senderId: string };
      upTo: Date;
    }>([
      { $match: { conversationId: { $in: conversationIds }, [field]: at } },
      {
        $group: {
          _id: { conversationId: '$conversationId', senderId: '$senderId' },
          upTo: { $max: '$createdAt' },
        },
      },
      { $limit: 500 },
    ])
    .toArray();
  await Promise.all(
    groups.map((g) =>
      publishToUsers([g._id.senderId], {
        type: 'receipt',
        conversationId: g._id.conversationId,
        by,
        status,
        upTo: g.upTo.toISOString(),
        at: at.toISOString(),
      }),
    ),
  );
}

/**
 * Two grey ticks: every message to this person that their browser has now
 * received (in one chat, or all of them). In a group a message gets them
 * once everyone has it. Senders are told live.
 */
export async function markDelivered(
  userId: string,
  { conversationId }: { conversationId?: string | null } = {},
) {
  const { messages } = await collections();
  const filter: Record<string, unknown> = {
    recipientIds: userId,
    deliveredAt: null,
    deliveredTo: { $ne: userId },
  };
  if (conversationId) filter.conversationId = conversationId;
  const ids = (
    (await messages.distinct('conversationId', filter)) as string[]
  ).slice(0, 500);
  if (!ids.length) return 0;
  const now = new Date();
  const result = await messages.updateMany(
    { ...filter, conversationId: { $in: ids } },
    { $addToSet: { deliveredTo: userId } },
  );
  await messages.updateMany(
    {
      conversationId: { $in: ids },
      deliveredAt: null,
      ...allOf('deliveredTo'),
    },
    { $set: { deliveredAt: now } },
  );
  await announceReceipts(ids, userId, 'delivered', now);
  return result.modifiedCount;
}

/**
 * Two blue ticks: the person has seen every message in the chat so far. In
 * a group a message turns blue once everyone has seen it.
 */
export async function markRead(userId: string, conversationId: string) {
  const { room } = await requireConversation(userId, conversationId);
  const { conversations, messages } = await collections();
  const now = new Date();
  const filter = {
    conversationId,
    recipientIds: userId,
    readAt: null,
    readBy: { $ne: userId },
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
  await messages.updateMany(filter, {
    $addToSet: { readBy: userId, deliveredTo: userId },
  });
  const base = { conversationId, createdAt: { $lte: now } };
  await messages.updateMany(
    { ...base, deliveredAt: null, ...allOf('deliveredTo') },
    { $set: { deliveredAt: now } },
  );
  await messages.updateMany(
    { ...base, readAt: null, ...allOf('readBy') },
    { $set: { readAt: now } },
  );
  await Promise.all([
    announceReceipts([conversationId], userId, 'read', now),
    // Group senders see how many have read their message.
    isGroup(room) ? publishGroupReadCounts(room, userId, now) : null,
    // The person's other open devices clear the unread count too.
    publishToUsers([userId], { type: 'conversation', conversationId }),
  ]);
}

/** In groups, senders' "read by 3 of 5" moves as people read. */
async function publishGroupReadCounts(
  room: ConversationDoc,
  readerId: string,
  upTo: Date,
) {
  const { messages } = await collections();
  const conversationId = room._id.toHexString();
  const recent = await messages
    .find({
      conversationId,
      readBy: readerId,
      createdAt: { $lte: upTo },
      kind: { $ne: 'system' },
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();
  await Promise.all(
    recent.map((doc) =>
      publishToUsers([doc.senderId], {
        type: 'update',
        conversationId,
        message: toMessage(doc),
      }),
    ),
  );
}

/** Total unread messages across chats the person can see, for the badge. */
export async function unreadSummary(userId: string) {
  const { conversations } = await collections();
  const [rooms, contacts] = await Promise.all([
    conversations
      .find(
        { memberIds: userId, [`state.${userId}.unread`]: { $gt: 0 } },
        { projection: { memberIds: 1, state: 1, kind: 1 } },
      )
      .toArray(),
    contactsOf(userId),
  ]);
  let unread = 0;
  let chats = 0;
  for (const c of rooms) {
    if (!isGroup(c) && !contacts.has(partnerOf(c, userId))) continue;
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
  const { room } = await requireConversation(userId, doc.conversationId);
  if (doc.kind === 'system') throw new ChatError(400, 'That is a group note.');
  return { doc, room, messages };
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
  const since = visibleSince(room, stateOf(room, userId));
  if (
    doc.deletedAt ||
    (doc.hiddenFor ?? []).includes(userId) ||
    (since && doc.createdAt <= since)
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
      (c) => isGroup(c) || contacts.has(partnerOf(c, userId)),
    );
  }
  if (!rooms.length) return [];
  const regex = new RegExp(escapeRegex(query), 'i');
  const docs = await messages
    .find({
      $or: rooms.map((c) => ({
        conversationId: c._id.toHexString(),
        ...visibleTo(c, userId),
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
