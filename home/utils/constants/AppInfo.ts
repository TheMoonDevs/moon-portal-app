export const IS_DARK_MODE = process.env.NEXT_PUBLIC_THEME == 'dark';
export const IS_THEME_SWITCH =
  process.env.NEXT_PUBLIC_THEME_SWITCH == 'visible';
export const IN_DEV = process.env.NODE_ENV === 'development';
export const IN_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === 'testnet';
export const GTAG_ID = process.env.NEXT_PUBLIC_GTAG_ID || 'fdd';
export const APP_ROUTES = {
  index: '/',
  getStarted: '/get-started',
  workLife: '/worklife',
  blogs: '/worklife/blogs',
  story: '/worklife/story',
  careers: '/worklife/careers',
  refer_earn: '/offers/refer-&-earn',
  docs_privacy: '/documents/privacy',
  docs_terms: '/documents/terms',
};
export const SOCIAL_ROUTES = {
  telegram: '/',
  twitter: 'https://twitter.com/TheMoonDevs',
  instagram: 'https://www.instagram.com/themoondevs/',
  linkedin: 'https://www.linkedin.com/company/themoondevs',
  discord: 'https://discord.gg/qdk6pd5Pd6',
};

export const APP_INFO = {
  title: 'TheMoonDevs',
  description:
    'Hire expert developers risk-free with The Moon Devs. Start a 7-day free trial to experience high-quality development. Commitment is optional, and confidentiality is guaranteed.',
  //"images/logo/socialbanner.png",
  image_url: 'logo/logo.png',
  default_keywords:
    'Dapps,Decentralized,The Moon Devs, startup, hire developers, expert developers, risk-free trial, software development, start-up development, mobile app development, web development, project trial',
  logo: IS_DARK_MODE ? '/logo_dark.svg' : 'logo/logo.png',
  logo_dark: 'logo/logo.png',
  base_url: IN_DEV
    ? 'http://localhost:3000'
    : IN_TESTNET
      ? 'https://themoondevs.com/'
      : 'https://themoondevs.com/',
  contactUrl: 'mailto:contact@themoondevs.com',
  mail_refer:
    'mailto:contact@themoondevs.com?subject=Referral%20Program%20-%20TheMoonDevs',
  no_reply_mail: 'no-reply@themoondevs.com',
};
