export enum APP_ROUTES {
  home = '/',
  login = '/login',
  logout = '/logout',
  admin = '/admin',
  userEditor = '/admin/user/editor',
  notifications = '/notifications',
  settings = '/settings',
  userWorklogs = '/user/worklogs',
  world = '/world',
  userWorklogSummary = '/user/worklogs/summary',
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
