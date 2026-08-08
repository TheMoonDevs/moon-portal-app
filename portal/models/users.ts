import type {
  PayData,
  personalData,
  workData,
} from '@/models/domains/user-profile';

import {
  type BaseModel,
  createCrudSchemas,
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
    /**
     * Access-control policies granted to this user, expressed as
     * `resource:action` strings (e.g. `worksheets:read`, `users:edit`).
     * These are ADDED on top of the user's role defaults. Managed via
     * /api/user/permissions.
     */
    permissions?: Nullable<string[]>;
    /**
     * Policies explicitly REMOVED from this user, overriding both their role
     * defaults and (for admins) the implicit wildcard. A permission listed here
     * is denied even if it would otherwise be granted — this is how a default
     * is taken away or a specific admin capability is disabled.
     */
    deniedPermissions?: Nullable<string[]>;
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
