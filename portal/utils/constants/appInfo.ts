export enum APP_ROUTES {
  home = "/",
  teams = "/teams",
  engagements = "/engagements",
  growth = "/growth",
  referrals = "/referrals",
  notifications = "/notifications",
  dashboard = "/dashboard",
  analytics = "/analytics",
  docs = "/docs",
  login = "/login",
  logout = "/logout",
  signup = "/signup",
  admin = "/admin",
  fileUploads = "/file-uploads",
  quicklinksDashboard = "/quicklinks/dashboard",
  userEditor = "/admin/user/editor",
  userZeroTracker = "/user/zero-tracker",
  userWorklogs = "/user/worklogs",
  hrScreening = "/hr/screening",
  urlShortener = "/url-shortener",
}

export enum GLOBAL_ROUTES {
  applicationForm = "/application/position/",
}

export const AppRoutesHelper = {
  bottomBarShown: (path?: string | null) => {
    return !path?.startsWith("/admin") && !path?.startsWith("/hr");
  },
};

export enum APP_SOCIAL {
  discord = "",
  twitter = "",
  telegram = "",
  instagram = "",
  linkedin = "",
  youtube = "",
  clickup = "https://app.clickup.com/",
  slack = "https://app.slack.com/client/T01J1LR0YDN",
}

export enum LOCAL_STORAGE {
  user = "moon_portal_user",
}
export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:3000";
export const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === "true";
