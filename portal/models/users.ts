import {
  type BaseModel,
  createCrudSchemas,
  type Loose,
  type Nullable,
} from './shared/base';
import type { USERSTATUS } from './shared/enums';

/**
 * A person who can sign in to the Portal. Company membership, roles and work
 * live in their own collections; this record only holds identity and access.
 *
 * Older records may still carry fields from the previous portal (workData,
 * payData, vertical, …). Nothing reads them any more.
 */
export type User = Loose<
  BaseModel & {
    /**
     * Public handle (`@jane`): unique, lower-case, editable. Not used to sign
     * in. See lib/users/username.ts for the rules.
     */
    username: string;
    /** The private six-character sign-in code, upper-case. Unique. */
    code?: Nullable<string>;
    /**
     * Before usernames, the code was split across `username` (first three
     * characters) and `password` (last three). Migrated records keep the old
     * pair in `legacyUsername` and `password`; nothing reads them.
     */
    legacyUsername?: Nullable<string>;
    password?: Nullable<string>;
    email?: Nullable<string>;
    /**
     * Extra Google accounts that may be used to sign in, on top of `email`.
     * Stored lower-cased.
     */
    linkedEmails?: Nullable<string[]>;
    name?: Nullable<string>;
    avatar?: Nullable<string>;
    positionTitle?: Nullable<string>;
    timezone?: Nullable<string>;
    status: USERSTATUS;
    /** Full access to everything (the `*` permission). */
    isAdmin?: boolean;
    /** Portal-wide roles (see the `Role` collection). */
    roleKeys?: Nullable<string[]>;
    /**
     * Extra permissions granted to this user on top of their roles, as
     * `resource:action` strings (e.g. `worklogs:read`, `users:edit`).
     */
    permissions?: Nullable<string[]>;
    /**
     * Permissions explicitly REMOVED from this user. A permission listed here
     * is denied even if a role or admin status would grant it.
     */
    deniedPermissions?: Nullable<string[]>;
  }
>;

/** A named set of portal-wide permissions that can be given to users. */
export type Role = Loose<
  BaseModel & {
    key: string;
    name: string;
    description?: Nullable<string>;
    permissions: string[];
    /** Built-in; can be edited but not deleted. */
    isSystem?: boolean;
  }
>;

export const userSchemas = createCrudSchemas<User>();
export const roleSchemas = createCrudSchemas<Role>();
