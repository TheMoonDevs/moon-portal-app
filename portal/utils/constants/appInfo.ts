export enum APP_ROUTES {
  home = '/',
  login = '/login',
  logout = '/logout',
  admin = '/admin',
  /** Hiring, onboarding and courses: /hiring?view=<page>. */
  hiring = '/hiring',
  userEditor = '/admin/user/editor',
  notifications = '/notifications',
  settings = '/settings',
  userWorklogs = '/user/worklogs',
  world = '/world',
  plans = '/plans',
  projects = '/projects',
  /** Every goal across projects, on a calendar. */
  goals = '/goals',
  meet = '/meet',
  /** Direct messages: /messages, /messages/<chatId> for one chat. */
  messages = '/messages',
  /** A person's page: /user for your own, /user/<id> for someone's. */
  user = '/user',
}

export enum LOCAL_STORAGE {
  user = 'moon_portal_user',
}

export const IN_DEV = process.env.NODE_ENV === 'development';

export const APP_BASE_URL = IN_DEV
  ? 'http://localhost:3000'
  : process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000';

export const TMD_PORTAL_API_KEY = process.env
  .NEXT_PUBLIC_TMD_PORTAL_API_KEY as string;
