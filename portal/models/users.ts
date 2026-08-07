import type {
  PayData,
  personalData,
  workData,
} from '@/models/domains/user-profile';

import {
  createCrudSchemas,
  type BaseModel,
  type JsonObject,
  type Loose,
  type Nullable,
  type OptionalNullable,
} from './shared/base';
import type {
  HOUSEID,
  USERINDUSTRY,
  USERROLE,
  USERSTATUS,
  USERTYPE,
  USERVERTICAL,
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

export const userSchemas = createCrudSchemas<User>();
