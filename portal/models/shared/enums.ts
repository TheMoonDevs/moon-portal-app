import type { JsonObject, OptionalNullable } from './base';

export type STATUS = { label: string; value: string; color: string };
export type PRIORITY = { label: string; value: string; color: string };
export type KEYS = { p256dh: string; auth: string };
export type PUSHNOTIFICATION = {
  endpoint: string;
  expirationTime?: string | null;
  keys: KEYS;
};
export type WORKEXPERIENCE = {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  technologies: string[];
  description: string;
};
export type PROJECTS = {
  name: string;
  link: string;
  startDate: string;
  endDate: string;
  technologies: string[];
  description: string;
};
export type SOCIALLINK = { platform: string; link: string };

export const ROOTTYPE = {
  DEPARTMENT: 'DEPARTMENT',
  COMMON_RESOURCES: 'COMMON_RESOURCES',
} as const;
export type ROOTTYPE = (typeof ROOTTYPE)[keyof typeof ROOTTYPE];

export enum DIRECTORYTYPE {
  PARENT = 'PARENT',
}
export enum USERDIRECTORYTYPE {
  FAVORITED = 'FAVORITED',
  OTHER = 'OTHER',
}
export enum USERLINKTYPE {
  FAVORITED = 'FAVORITED',
  TOPUSED = 'TOPUSED',
  CUSTOM = 'CUSTOM',
}
export enum JOBPOST {
  FULLTIME = 'FULLTIME',
  PARTTIME = 'PARTTIME',
  INTERN = 'INTERN',
}
export enum JOBSTATUS {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
export enum USERTYPE {
  MEMBER = 'MEMBER',
  CLIENT = 'CLIENT',
}
export enum USERSTATUS {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
}
export enum USERROLE {
  CORETEAM = 'CORETEAM',
  ASSOCIATE = 'ASSOCIATE',
  FREELANCER = 'FREELANCER',
  INTERN = 'INTERN',
  TRIAL_CANDIDATE = 'TRIAL_CANDIDATE',
}
export enum USERVERTICAL {
  DEV = 'DEV',
  DESIGN = 'DESIGN',
  MARKETING = 'MARKETING',
  COMMUNITY = 'COMMUNITY',
  FINANCE = 'FINANCE',
  LEGAL = 'LEGAL',
  HR = 'HR',
  OPERATIONS = 'OPERATIONS',
}
export enum HOUSEID {
  MANAGEMENT = 'MANAGEMENT',
  GROWTH = 'GROWTH',
  PRODUCT_TECH = 'PRODUCT_TECH',
  EXECUTIVE = 'EXECUTIVE',
}
export enum USERINDUSTRY {
  CRYPTO = 'CRYPTO',
  FINANCE = 'FINANCE',
  HEALTHCARE = 'HEALTHCARE',
  EDUCATION = 'EDUCATION',
  RETAIL = 'RETAIL',
  REALSTATE = 'REALSTATE',
  GAMING = 'GAMING',
  SOCIAL = 'SOCIAL',
  OTHERS = 'OTHERS',
}
export enum CANDIDATERESULT {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PENDING = 'PENDING',
}
export enum NotificationType {
  ADMIN = 'ADMIN',
  SELF_GENERATED = 'SELF_GENERATED',
  USER_TO_USER = 'USER_TO_USER',
}
export enum BadgeType {
  CUSTOM = 'CUSTOM',
  STREAK = 'STREAK',
  TIME_BASED = 'TIME_BASED',
}
export enum StreakType {
  WORKLOG_BASED = 'WORKLOG_BASED',
  TASK_BASED = 'TASK_BASED',
  MISSION_BASED = 'MISSION_BASED',
  ARTICLE_BASED = 'ARTICLE_BASED',
}
export enum BadgeStatus {
  INACTIVE = 'INACTIVE',
  ACTIVATED = 'ACTIVATED',
  REWARDED = 'REWARDED',
  SUSPENDED = 'SUSPENDED',
}
export enum BUFF_LEVEL {
  TRUTH_SEEKER = 'TRUTH_SEEKER',
  BABY_GROOT = 'BABY_GROOT',
  WORK_HULK = 'WORK_HULK',
  VAMPIRE_LORD = 'VAMPIRE_LORD',
  ALIEN_PREDATOR = 'ALIEN_PREDATOR',
  DEVIL = 'DEVIL',
}
export enum ENGAGEMENTTYPE {
  HOURLY = 'HOURLY',
  PART_TIME = 'PART_TIME',
  FULL_TIME = 'FULL_TIME',
  FIXED = 'FIXED',
}
export enum BOTMODE {
  DEV = 'DEV',
  PROD = 'PROD',
  STAGING = 'STAGING',
  PREVIEW = 'PREVIEW',
}
export enum REQUESTSTATUS {
  UN_ASSIGNED = 'UN_ASSIGNED',
  IN_DEVELOPMENT = 'IN_DEVELOPMENT',
  IN_REVIEW = 'IN_REVIEW',
  CLOSED = 'CLOSED',
  COMPLETED = 'COMPLETED',
}
export enum FUNCTIONTYPE {
  WEBHOOK = 'WEBHOOK',
  API = 'API',
  SCHEDULED = 'SCHEDULED',
}
export enum UPDATETYPE {
  MESSAGE = 'MESSAGE',
  STATUS = 'STATUS',
}
export enum UPDATEFROM {
  CLIENT = 'CLIENT',
  BOT = 'BOT',
  COMMENT = 'COMMENT',
  SYSTEM = 'SYSTEM',
  SERVER = 'SERVER',
}
export enum PayType {
  BANK = 'BANK',
  CRYPTO = 'CRYPTO',
}

export type Preferences = {
  frequency: Frequency;
  categories: Category[];
  contentLength: ContentLength;
  contentFormat: ContentFormat;
  receiveImportantUpdates: boolean;
  preferredLanguage?: OptionalNullable<string>;
};

export type ContactDetails = {
  phone?: string | null;
  address?: string | null;
  socialMediaHandles?: OptionalNullable<JsonObject>;
};

export enum UserType {
  client = 'client',
  developer = 'developer',
  other = 'other',
}

export enum Source {
  home_signup = 'home_signup',
  sense = 'sense',
  connect = 'connect',
  tally_form = 'tally_form',
  linkedin = 'linkedin',
  other = 'other',
}

export enum SubscriptionStatus {
  active = 'active',
  paused = 'paused',
  unsubscribed = 'unsubscribed',
}

export enum Frequency {
  daily = 'daily',
  weekly = 'weekly',
  bi_weekly = 'bi_weekly',
}

export enum ContentLength {
  short = 'short',
  medium = 'medium',
  long = 'long',
}

export enum ContentFormat {
  summary = 'summary',
  detailed = 'detailed',
  mixed = 'mixed',
}

export enum EmailStatus {
  sent = 'sent',
  bounced = 'bounced',
  delivered = 'delivered',
}

export enum Category {
  frontend = 'frontend',
  backend = 'backend',
  fullstack = 'fullstack',
  cloud = 'cloud',
  devops = 'devops',
  security = 'security',
  blockchain = 'blockchain',
  mobile = 'mobile',
  other = 'other',
}
