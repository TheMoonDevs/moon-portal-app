export enum APP_ROUTES {
  home = "/",
  dashboard = "/dashboard/tmd-credits",
  credits = "/dashboard/tmd-credits",
  payments = "/dashboard/payments",
  certificates = "/dashboard/certificates",
  invoices = "/dashboard/invoices",
  payUPI = "/dashboard/pay-upi-id",
  claimRequests = "/dashboard/claim-requests",
  referralsDashboard = "/referrals/dashboard/user-referrals",
  referralsTransactions = "/referrals/dashboard/transactions",
  referralsInvoices = "/referrals/dashboard/invoices",
  referralsAdmin = "/referrals/dashboard/admin",
  referrals = "/referrals",
}

export const MEMBER_SIDEBAR_LINKS = [
  {
    title: "TMD-CREDITS",
    href: APP_ROUTES.credits,
    adminOnly: false,
  },
  {
    title: "PAYMENTS",
    href: APP_ROUTES.payments,
    adminOnly: false,
  },
  {
    title: "CERTIFICATES",
    href: APP_ROUTES.certificates,
    adminOnly: false,
  },
  {
    title: "INVOICES",
    href: APP_ROUTES.invoices,
    adminOnly: false,
  },
  { title: "PAY-UPI ID", href: APP_ROUTES.payUPI, adminOnly: true },
  { title: "CLAIM REQ", href: APP_ROUTES.claimRequests, adminOnly: true },
];

export const REFERRAL_DASHBOARD_SIDEBAR_LINKS = [
  {
    title: "REFERRALS",
    href: APP_ROUTES.referralsDashboard,
    adminOnly: false,
  },
  {
    title: "TRANSACTIONS",
    href: APP_ROUTES.referralsTransactions,
    adminOnly: false,
  },
  { title: "INVOICES", href: APP_ROUTES.referralsInvoices, adminOnly: false },
  { title: "ADMIN", href: APP_ROUTES.referralsAdmin, adminOnly: true },
];

export const APP_INFO = {
  name: "TheMoonDevs - PayZone",
  icon: "/favicon.ico",
  description: "THE MOON DEVS PAYMENT APP",
};


export enum chainEnum {
  bscTestnet = 97,
  base = 8453,
  baseSepolia = 84532,
}

export enum TOKEN_INFO {
  decimals = 6,
  name = "TMDToken",
  contractAddress = "0x490f0C989BfC844c5501242292A8b2A97148E952",
  chainId = chainEnum.baseSepolia,
  burnAddress = "0x000000000000000000000000000000000000dEaD",
}

export const copyUPI = (upiId: string) => {
  navigator.clipboard
    .writeText(upiId)
    .then(() => {
      // console.log("UPI ID copied to clipboard");
      alert("UPI ID copied to clipboard");
    })
    .catch((err) => {
      console.error("Error copying UPI ID to clipboard:", err);
    });
};
