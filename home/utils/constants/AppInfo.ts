export const IS_DARK_MODE = process.env.NEXT_PUBLIC_THEME == "dark";
export const IS_THEME_SWITCH =
  process.env.NEXT_PUBLIC_THEME_SWITCH == "visible";
export const IN_DEV = process.env.NODE_ENV === "development";
export const IN_TESNTET = process.env.NEXT_PUBLIC_IS_TESTNET === "testnet";
export const GTAG_ID = process.env.NEXT_PUBLIC_GTAG_ID || "fdd";

export const APP_ROUTES = {
  index: "/",
  getStarted: "/get-started",
  workLife: "/worklife",
  blogs: "/worklife/blogs",
  story: "/worklife/story",
  careers: "/worklife/careers",
  refer_earn: "/offers/refer-&-earn",
  docs_privacy: "/documents/privacy",
  docs_terms: "/documents/terms",
};

export const SOCIAL_ROUTES = {
  telegram: "/",
  twitter: "https://twitter.com/TheMoonDevs",
  instagram: "https://www.instagram.com/themoondevs/",
  linkedin: "https://www.linkedin.com/company/themoondevs",
  discord: "https://discord.gg/qdk6pd5Pd6",
};

export const APP_INFO = {
  title: "TheMoonDevs",
  description: "The Moon Devs",
  //"images/logo/socialbanner.png",
  image_url: "images/logo/logo_square.jpg",
  default_keywords: "Dapps,Decentralized,",
  logo: IS_DARK_MODE ? "/logo_dark.svg" : "/logo.svg",
  logo_dark: "/logo_dark.svg",
  base_url: IN_DEV
    ? "http://localhost:3000/"
    : IN_TESNTET
      ? "https://themoondevs.com/"
      : "https://themoondevs.com/",
  contactUrl: "mailto:contact@themoondevs.com",
  mail_refer:
    "mailto:contact@themoondevs.com?subject=Referral%20Program%20-%20TheMoonDevs",
  no_reply_mail: "no-reply@themoondevs.com",
};

export enum DocumentPageType {
  PRIVACY = "privacy",
  TERMS = "terms",
  SENSE_PRIVACY = "sense-privacy",
  SENSE_TERMS = "sense-terms",
}