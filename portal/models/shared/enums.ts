export type KEYS = { p256dh: string; auth: string };

export type PUSHNOTIFICATION = {
  endpoint: string;
  expirationTime?: string | null;
  keys: KEYS;
};

export enum USERSTATUS {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
}

export enum NotificationType {
  ADMIN = 'ADMIN',
  SELF_GENERATED = 'SELF_GENERATED',
  USER_TO_USER = 'USER_TO_USER',
}
