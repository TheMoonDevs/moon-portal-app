export enum APP_ROUTES {
    home = '/',
    teams = '/teams',
    engagements = '/engagements',
    growth = '/growth',
    notifications = '/notifications',
    dashboard= '/dashboard',
    analytics= '/analytics',
    docs = '/docs',
    login = '/login',
    logout = '/logout',
    signup = '/signup',
    admin = '/admin',
    userEditor = '/admin/user/editor',
    userWorklogs = '/user/worklogs',
};

export enum APP_SOCIAL {
    discord = '',
    twitter = '',
    telegram = '',
    instagram = '',
    linkedin = '',
    youtube = '',
}

export const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';