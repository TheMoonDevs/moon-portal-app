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
    'We provide high-quality developer guidance and solutions for start-ups, and lead companies that struggle with finding the right and robust team to launch their products or unblock the tougher cogs in complicated digital problems. As the trusted technology partner, we go beyond mere development. We provide comprehensive support and maintenance services, ensuring that your digital assets remain secure, up-to-date, and optimized for peak performance. Our commitment to your success extends beyond the initial launch, as we continually strive to keep your digital presence at the forefront of industry trends.',
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

export enum DocumentPageType {
  PRIVACY = "privacy",
  TERMS = "terms",
  SENSE_PRIVACY = "sense-privacy",
  SENSE_TERMS = "sense-terms",
}