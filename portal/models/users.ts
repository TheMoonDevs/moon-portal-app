import type { PayData, personalData, workData } from '@/models/domains/user-profile';

import { createCrudSchemas, type BaseModel, type JsonObject, type Loose, type Nullable, type OptionalNullable } from './shared/base';
import {
  type Category,
  type ContactDetails,
  type Frequency,
  type HOUSEID,
  type Preferences,
  type PROJECTS,
  type SOCIALLINK,
  type SubscriptionStatus,
  type USERTYPE,
  type USERINDUSTRY,
  type USERROLE,
  type USERSTATUS,
  type USERVERTICAL,
  type UserType,
  type WORKEXPERIENCE,
  type PUSHNOTIFICATION,
} from './shared/enums';

export type User = Loose<
  BaseModel & {
    username: string;
    password: string;
    passphrase?: Nullable<string>;
    email?: Nullable<string>;
    name?: Nullable<string>;
    avatar?: Nullable<string>;
    banner?: Nullable<string>;
    description?: Nullable<string>;
    userType: USERTYPE;
    role: USERROLE;
    vertical: USERVERTICAL;
    house: HOUSEID;
    status: USERSTATUS;
    industry?: Nullable<USERINDUSTRY>;
    isAdmin?: boolean;
    timezone?: Nullable<string>;
    country?: Nullable<string>;
    workData?: OptionalNullable<workData & { overlap?: unknown[] }>;
    personalData?: OptionalNullable<personalData>;
    payData?: OptionalNullable<PayData>;
    thirdPartyData?: OptionalNullable<JsonObject>;
    slackId?: Nullable<string>;
    positionTitle?: Nullable<string>;
    buffBadge?: unknown[];
  }
>;

export type Survey = Loose<
  BaseModel & {
    username: string;
    password: string;
    name?: Nullable<string>;
  }
>;

export type Subscription = Loose<
  BaseModel & {
    userId: string;
    subscriptions: PUSHNOTIFICATION[];
  }
>;

export type DevProfile = Loose<
  BaseModel & {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string;
    bio: string;
    address: string;
    city: string;
    state: string;
    country: string;
    profession: string;
    availability?: Nullable<string>;
    expertise: string[];
    workExperience: WORKEXPERIENCE[];
    projects: PROJECTS[];
    socialLinks: SOCIALLINK[];
  }
>;

export type EmailSubscriber = Loose<
  BaseModel & {
    email: string;
    name?: Nullable<string>;
    userType?: OptionalNullable<UserType>;
    source?: Nullable<string>;
    subscriptionStatus?: OptionalNullable<SubscriptionStatus>;
    timeZone?: Nullable<string>;
    preferences?: OptionalNullable<Preferences>;
    contactDetails?: OptionalNullable<ContactDetails>;
    context?: Nullable<string>;
  }
>;

export const userSchemas = createCrudSchemas<User>();
export const surveySchemas = createCrudSchemas<Survey>();
export const subscriptionSchemas = createCrudSchemas<Subscription>();
export const devProfileSchemas = createCrudSchemas<DevProfile>();
export const emailSubscriberSchemas = createCrudSchemas<EmailSubscriber>();
