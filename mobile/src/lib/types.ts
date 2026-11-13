/*
 * The shapes the app reads from the portal API. Copied from portal/models
 * (workspace.ts, users.ts, chat.ts, meet.ts, progress.ts) and trimmed to the
 * fields the app uses; keep them in step when those change.
 */

export type Profile = {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  avatar: string | null;
  positionTitle?: string | null;
  timezone?: string | null;
  /** An Apple ID is linked, so the app can sign in with Apple. */
  appleLinked?: boolean;
  deletionRequestedAt?: string | null;
};

export type Company = {
  id: string;
  name: string;
  slug?: string;
  logo?: string | null;
  color?: string | null;
  isPersonal?: boolean;
  description?: string | null;
  brandKit?: BrandKit | null;
};

/** A company's or project's brand: logos, colours, fonts and files. */
export type BrandKit = {
  name?: string;
  note?: string;
  logos?: { label: string; url: string; background?: string }[];
  colors?: { name: string; hex: string; role?: string }[];
  fonts?: { family: string; weight?: number; url?: string; role?: string }[];
  assets?: {
    label: string;
    url: string;
    kind: 'image' | 'video' | 'audio' | 'font' | 'document' | 'other';
    group?: string;
  }[];
  guide?: string;
};

/** GET /api/workspace */
export type Workspace = {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  permissions: string[];
  companies: {
    company: Company;
    permissions: string[];
    /** Their membership, with their roles in the company. */
    member?: { roleKeys?: string[] | null } | null;
  }[];
};

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'IGNORED' | 'ARCHIVED';

/** What a work point can move its task to. */
export type PointStatus = 'doing' | 'paused' | 'done' | 'not_done' | 'blocked' | 'waiting';

/** What the app can set on a task (PATCH /api/me/day/tasks/:id). */
export type TaskMove = PointStatus | 'todo' | 'archived';

export type MeetingFacts = {
  bookingId: string;
  start: string;
  end: string;
  /** "14:30–15:00" in the person's timezone. */
  time: string;
  timezone: string;
  with: string;
  interview: boolean;
  /** The portal's join link, relative. */
  joinUrl: string | null;
  note: string | null;
  status: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  companyId: string;
  projectId: string;
  size?: 'MAJOR' | 'MINOR';
  forDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  goalId?: string | null;
  /** "waiting", "blocked" or "paused": a status the task's last point set. */
  flag?: 'waiting' | 'blocked' | 'paused' | null;
  ownerId?: string | null;
  assigneeIds?: string[];
  madeBy?: string | null;
  meetBookingId?: string | null;
  meeting?: MeetingFacts | null;
};

export type WorkPoint = {
  id: string;
  taskId: string;
  userId: string;
  /** YYYY-MM-DD */
  date: string;
  text: string;
  status?: PointStatus | null;
  /** `person`, `claude` or another bot. */
  by: string;
  at: string;
  isPrivate?: boolean;
};

export type GoalRef = {
  id: string;
  title: string;
  kind?: 'scheduled' | 'target';
};

export type ProjectRef = {
  id: string;
  name: string;
  color?: string | null;
  logo?: string | null;
  companyId: string;
  companyName?: string;
  isPersonal?: boolean;
  goals?: GoalRef[];
};

/** GET /api/me/day?date=YYYY-MM-DD */
export type Day = {
  date: string;
  today: string;
  tasks: Task[];
  points: WorkPoint[];
  projects: ProjectRef[];
  companies?: { id: string; name: string; isPersonal?: boolean }[];
};

/** GET /api/me/tasks */
export type MyTasks = {
  today: string;
  tasks: Task[];
  archived: Task[];
  projects: ProjectRef[];
};

/** GET /api/mobile/tasks/:id */
export type TaskDetail = {
  task: Task;
  points: WorkPoint[];
  project: ProjectRef | null;
  people: PublicUser[];
};

export type DayLine = {
  text: string;
  status: PointStatus | 'archived' | null;
  goalMissed?: boolean;
};

/** GET /api/me/days?from=&to= */
export type Days = { from: string; to: string; days: Record<string, DayLine[]> };

/** GET /api/me/month?month=YYYY-MM */
export type MonthScore = {
  month: string;
  /** A point for each day of work on a task, plus finishing bonuses. */
  points: number;
  taskDays: number;
  /** Tasks finished in the month. */
  finished: number;
  /** Days with work logged. */
  days: number;
};

export type PublicUser = {
  id: string;
  name: string | null;
  username?: string | null;
  avatar?: string | null;
  email?: string | null;
  positionTitle?: string | null;
};

/* -------------------------------- Notifications ------------------------------- */

export type NotificationAction = { title: string; trigger_type: string; trigger: string };

export type PortalNotification = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  isRead?: boolean | null;
  notificationType?: string;
  notificationData?: {
    actions?: NotificationAction[];
    actionDone?: boolean;
    kind?: string;
    bookingId?: string;
  } | null;
};

/* ------------------------------------ Chat ------------------------------------ */

export type ChatKind = 'text' | 'image' | 'video' | 'file' | 'system';

export type ChatAttachment = {
  key: string;
  name: string;
  mime: string;
  size: number;
  width?: number | null;
  height?: number | null;
  thumbKey?: string | null;
  expiredAt?: string | null;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  clientId: string;
  kind: ChatKind;
  text: string;
  attachment?: ChatAttachment | null;
  replyTo?: { id: string; senderId: string; kind: ChatKind; text: string } | null;
  forwarded?: boolean;
  system?: {
    action: string;
    actorName: string;
    targetNames?: string[];
    name?: string | null;
  } | null;
  /** Group members named with @ (lib/mentions.ts). */
  mentions?: string[] | null;
  reactions: { userId: string; emoji: string }[];
  createdAt: string;
  editedAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  readCount?: number | null;
  recipientCount?: number | null;
  deletedAt?: string | null;
  /** Only in the app: still sending, or failed to send. */
  pending?: 'sending' | 'failed';
};

export type ChatPerson = {
  id: string;
  name: string | null;
  username?: string | null;
  avatar?: string | null;
  positionTitle?: string | null;
  companies?: string[];
};

export type ChatConversation = {
  id: string;
  kind: 'direct' | 'group' | 'project';
  partner: ChatPerson;
  group?: {
    name: string;
    avatar: string | null;
    description?: string | null;
    members: ChatPerson[];
    adminIds: string[];
    projectId?: string | null;
    companyName?: string | null;
    canManage: boolean;
  } | null;
  lastMessage: ChatMessage | null;
  lastMessageAt: string | null;
  unread: number;
  muted: boolean;
  pinned: boolean;
  archived: boolean;
  partnerLastSeenAt: string | null;
};

export type ChatEvent =
  | { type: 'message'; conversationId: string; message: ChatMessage }
  | { type: 'update'; conversationId: string; message: ChatMessage }
  | {
      type: 'receipt';
      conversationId: string;
      by: string;
      status: 'delivered' | 'read';
      upTo: string;
      at: string;
    }
  | { type: 'conversation'; conversationId: string };

/* ---------------------------------- Projects ---------------------------------- */

export type GoalProgress = {
  goalId: string;
  kind: 'scheduled' | 'target';
  done: number;
  manual: number;
  target: number;
  percent: number;
  from: string;
  to: string;
  contributors: { userId: string; done: number }[];
  achieved?: boolean;
  parts?: { id: string; label: string; done: number; target: number }[];
};

export type ProjectGoal = {
  id: string;
  title: string;
  kind?: 'scheduled' | 'target';
  target: number;
  period: string;
  days?: number[];
  assigneeIds?: string[];
  image?: string | null;
  achievedAt?: string | null;
};

export type Progress = {
  total: number;
  done: number;
  major: number;
  majorDone: number;
  percent: number;
};

export type Project = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  color?: string | null;
  logo?: string | null;
  companyId: string;
  parentId?: string | null;
  isCore?: boolean;
  isPersonal?: boolean;
  leadIds: string[];
  memberIds: string[];
  goals?: ProjectGoal[];
  progress?: Progress;
  goalProgress?: GoalProgress[];
  slug?: string;
  brandKit?: BrandKit | null;
  /** The image atop its page, picked by a lead from the brand kit. */
  headerImage?: string | null;
};

/** A project on the projects page, with what is going on in it. */
export type OverviewProject = Project & {
  activity: {
    from: string;
    /** Work logged on each of the last 7 days, oldest first. */
    days: number[];
    /** Who logged work this week, most recent first. */
    people: string[];
    lastDate: string | null;
  };
  tasks: { open: number; overdue: number };
  today: { total: number; done: number };
  month?: {
    from: string;
    days: number[];
    /** Tasks finished this month. */
    done: number;
    major: number;
  };
};

/** GET /api/projects/overview */
export type ProjectsOverview = {
  companies: {
    id: string;
    name: string;
    color: string | null;
    logo: string | null;
    description?: string | null;
    memberIds?: string[];
    isPersonal?: boolean;
  }[];
  projects: OverviewProject[];
  users: PublicUser[];
};

/** GET /api/projects/:id */
export type ProjectDetail = {
  project: Project;
  tasks: Task[];
  people: PublicUser[];
};

export type ProjectPage = {
  id: string;
  title: string;
  emoji?: string | null;
  kind: 'OBJECTIVE' | 'IDEA';
  parentId?: string | null;
  updatedAt?: string;
  content?: TiptapNode | null;
};

export type TiptapNode = {
  type: string;
  text?: string;
  attrs?: Record<string, any>;
  marks?: { type: string; attrs?: Record<string, any> }[];
  content?: TiptapNode[];
};

/** GET /api/goals?from=&to= */
export type GoalsCalendar = {
  today: string;
  from: string;
  to: string;
  projects: {
    id: string;
    name: string;
    companyId: string;
    color?: string | null;
    leadIds?: string[];
    memberIds?: string[];
    /** May change the project's goals. */
    canEdit?: boolean;
    /** May tick days and add progress by hand. */
    canUpdate?: boolean;
  }[];
  goals: (ProjectGoal & { projectId: string; progress: GoalProgress })[];
  tasks: {
    id: string;
    title: string;
    projectId: string;
    goalId: string;
    status: TaskStatus;
    forDate?: string | null;
    dueDate?: string | null;
    completedAt?: string | null;
    completedByIds?: string[] | null;
    assigneeIds?: string[] | null;
    goalMissed?: { day: string } | null;
  }[];
  tallies: { projectId: string; goalId: string; from: string; amount: number }[];
  users: PublicUser[];
};

export type PlanStep = {
  id: string;
  kind?: 'info' | 'task' | 'goal';
  text: string;
  notes?: string | null;
  projectId?: string | null;
  assigneeIds: string[];
  dueOn?: string | null;
  done?: boolean;
  taskId?: string | null;
  task?: { id: string; title: string; status: TaskStatus } | null;
  goalId?: string | null;
};

export type Plan = {
  id: string;
  companyId: string;
  projectId?: string | null;
  title: string;
  notes?: string | null;
  status: string;
  startOn?: string | null;
  endOn?: string | null;
  ownerId: string;
  steps: PlanStep[];
  updatedAt?: string;
};

/** GET /api/plans */
export type PlansList = {
  companies: { id: string; name: string; color: string | null }[];
  plans: Plan[];
  projects: { id: string; name: string; companyId: string; color?: string | null }[];
  people: { id: string; name: string | null; avatar?: string | null }[];
};

export type LeaderboardRow = {
  user: PublicUser;
  rank: number;
  points: number;
  tasksDone: number;
  worklogDays: number;
  buff: { title: string; src: string } | null;
};

export type BadgeProgress = {
  badge: {
    id: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    metric: string;
    threshold: number;
  };
  value: number;
  earnedAt: string | null;
};

/* ----------------------------------- Meet ------------------------------------ */

export type MeetBooking = {
  id: string;
  guestName: string;
  guestEmail: string;
  guestNote?: string | null;
  start: string;
  end: string;
  status: 'PENDING' | 'PROPOSED' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED';
  meetingUrl?: string | null;
  role?: string | null;
};

export type MeetProfile = {
  code: string;
  isActive: boolean;
  title?: string | null;
  durationMinutes: number;
};

/** GET /api/me/tokens */
export type Connection = {
  id: string;
  name: string;
  prefix: string;
  viaOAuth: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
};

/** GET /api/projects/:id/worklogs?days= : who worked on what, a day each. */
export type ProjectWorklogs = {
  from: string;
  to: string | null;
  days: number;
  entries: {
    id: string;
    date: string;
    userId: string;
    lines: { key: string; text: string; taskId: string | null; done: boolean }[];
  }[];
  users: PublicUser[];
};
