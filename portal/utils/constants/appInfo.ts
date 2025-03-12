export enum APP_ROUTES {
  home = '/',
  teams = '/teams',
  houses = '/houses',
  engagements = '/engagements',
  growth = '/growth',
  referrals = '/referrals',
  notifications = '/notifications',
  dashboard = '/dashboard',
  analytics = '/analytics',
  docs = '/docs',
  login = '/login',
  logout = '/logout',
  signup = '/signup',
  admin = '/admin',
  fileUploads = '/file-uploads',
  quicklinksDashboard = '/quicklinks/dashboard',
  userEditor = '/admin/user/editor',
  userZeroTracker = '/user/zero-tracker',
  userWorklogs = '/user/worklogs',
  hrScreening = '/hr/screening',
  urlShortener = '/url-shortener',
  userWorklogSummary = '/user/worklogs/summary',
  googleCalendar = '/google-calendar',
  badgeEditor = '/admin/badge/editor',
  invoices = '/invoices',
  devProfile = '/dev-profile',
  settings = '/settings',
  customBots = '/custom-bots',
}

export enum QUICKLINK_ROUTES {
  dashboard = '/quicklinks/dashboard',
  department = '/quicklinks/department',
  commonResources = '/quicklinks/common-resources',
  userList = '/quicklinks/user/user-list',
  userTopUsedLinks = '/quicklinks/user/links/top-used',
  userRecentlyUsedFolders = '/quicklinks/user/folders/recently-used',
  userTopUsedFolders = '/quicklinks/user/folders/top-used',
  trending = '/quicklinks/explore/trending',
  archive = '/quicklinks/archive',
}

export enum GLOBAL_ROUTES {
  applicationForm = '/application/position/',
}

export const AppRoutesHelper = {};

export enum APP_SOCIAL {
  discord = '',
  twitter = '',
  telegram = '',
  instagram = '',
  linkedin = '',
  youtube = '',
  clickup = 'https://app.clickup.com/',
  slack = 'https://app.slack.com/client/T01J1LR0YDN',
}

export enum LOCAL_STORAGE {
  user = 'moon_portal_user',
  passphrase = 'local_passphrase',
}
export const IN_DEV = process.env.NODE_ENV === 'development';
export const APP_BASE_URL = IN_DEV
  ? 'http://localhost:3000'
  : process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000';
export const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';
export const TMD_PORTAL_API_KEY = process.env
  .NEXT_PUBLIC_TMD_PORTAL_API_KEY as string;
