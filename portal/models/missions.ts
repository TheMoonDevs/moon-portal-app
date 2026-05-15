import { createCrudSchemas, type BaseModel, type Loose, type Nullable, type OptionalNullable } from './shared/base';
import {
  type BadgeStatus,
  type BadgeType,
  type HOUSEID,
  type NotificationType,
  type PRIORITY,
  type STATUS,
  type USERVERTICAL,
} from './shared/enums';

export type Notification = Loose<
  BaseModel & {
    updatedAt: Date | string;
    userId: string;
    title: string;
    description: string;
    matchId?: Nullable<string>;
    matchType?: Nullable<string>;
    notificationType: NotificationType;
    notificationData?: OptionalNullable<Record<string, unknown>>;
    isRead?: OptionalNullable<boolean>;
  }
>;

export type Mission = Loose<
  BaseModel & {
    house: HOUSEID;
    vertical?: OptionalNullable<USERVERTICAL>;
    month: string;
    completed?: OptionalNullable<boolean>;
    status?: OptionalNullable<STATUS>;
    priority?: OptionalNullable<PRIORITY>;
    housePoints: number;
    indiePoints: number;
    completedAt?: OptionalNullable<Date>;
    expirable?: OptionalNullable<boolean>;
    expiresAt?: OptionalNullable<Date>;
    title: string;
    description?: Nullable<string>;
  }
>;

export type MissionTask = Loose<
  BaseModel & {
    missionId: string;
    userId?: Nullable<string>;
    assignees: string[];
    title?: Nullable<string>;
    description?: Nullable<string>;
    status?: OptionalNullable<STATUS>;
    priority?: OptionalNullable<PRIORITY>;
    indiePoints: number;
    completedAt?: OptionalNullable<Date>;
    completed?: OptionalNullable<boolean>;
    expirable?: OptionalNullable<boolean>;
    expiresAt?: OptionalNullable<Date>;
    avatar: Nullable<string>;
    name: Nullable<string>;
    email: Nullable<string>;
    userInfoId?: Nullable<string>;
  }
>;

export type BadgeTemplate = Loose<
  BaseModel & {
    name: string;
    description: string;
    badgeType: BadgeType;
    imageurl: string;
    criteria: unknown;
  }
>;

export type BadgeRewarded = Loose<
  BaseModel & {
    userId: string;
    badgeTemplateId: string;
    name: string;
    sequence: string;
    date?: Nullable<string>;
    status: BadgeStatus;
    imageUrl?: Nullable<string>;
    showsCounter?: boolean;
  }
>;

export const notificationSchemas = createCrudSchemas<Notification>();
export const missionSchemas = createCrudSchemas<Mission>();
export const missionTaskSchemas = createCrudSchemas<MissionTask>();
export const badgeTemplateSchemas = createCrudSchemas<BadgeTemplate>();
export const badgeRewardedSchemas = createCrudSchemas<BadgeRewarded>();
