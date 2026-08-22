export enum APP_ROUTES {
  home = '/',
  login = '/login',
  logout = '/logout',
  admin = '/admin',
  userEditor = '/admin/user/editor',
  badgeEditor = '/admin/badge/editor',
  notifications = '/notifications',
  settings = '/settings',
  studio = '/studio',
  urlShortener = '/url-shortener',
  userWorklogs = '/user/worklogs',
  userWorklogSummary = '/user/worklogs/summary',
  worksheets = '/worksheets',
}

export enum APP_SOCIAL {
  slack = 'https://app.slack.com/client/T01J1LR0YDN',
  notion = 'https://app.notion.com/p/498fa11b889482e9b3fd81ee536c5964?v=941fa11b88948238b81288f1b4348172&source=copy_link',
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
