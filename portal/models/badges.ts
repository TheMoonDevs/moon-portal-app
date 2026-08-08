import {
  createCrudSchemas,
  type BaseModel,
  type Loose,
  type Nullable,
} from './shared/base';
import type { BadgeStatus, BadgeType, BUFF_LEVEL } from './shared/enums';

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

export type BuffBadge = Loose<
  BaseModel & {
    userId: string;
    title: string;
    points: number;
    buffLevel: BUFF_LEVEL;
    month: string;
    user?: Record<string, unknown>;
  }
>;

export const badgeTemplateSchemas = createCrudSchemas<BadgeTemplate>();
export const badgeRewardedSchemas = createCrudSchemas<BadgeRewarded>();
export const buffBadgeSchemas = createCrudSchemas<BuffBadge>();
