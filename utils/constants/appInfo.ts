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
    signup = '/signup',
    admin = '/admin',
    userEditor = '/admin/user/editor',
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