import {
  createCrudSchemas,
  type BaseModel,
  type Loose,
  type Nullable,
  type OptionalNullable,
} from './shared/base';
import type { NotificationType, PUSHNOTIFICATION } from './shared/enums';

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

export type Subscription = Loose<
  BaseModel & {
    userId: string;
    subscriptions: PUSHNOTIFICATION[];
  }
>;

export const notificationSchemas = createCrudSchemas<Notification>();
export const subscriptionSchemas = createCrudSchemas<Subscription>();
