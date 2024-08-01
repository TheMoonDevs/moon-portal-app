import { baseSepolia } from "viem/chains";
import { bill, license, payments, request, send_money, toll, admin, refer } from '../../public/icons/index'
import { toast } from "sonner";

const NEXT_PUBLIC_TMD_CONTRACT = process.env.NEXT_PUBLIC_TMD_CONTRACT
  ? process.env.NEXT_PUBLIC_TMD_CONTRACT
  : "0x718feaac496184980F7ccf0b07360C70b63c1705";

export enum APP_ROUTES {
  home = "/",
  dashboardHome = "/dashboard",
  dashboard = "/dashboard/tmd-credits",
  credits = "/dashboard/tmd-credits",
  payments = "/dashboard/payments",
  certificates = "/dashboard/certificates",
  invoices = "/dashboard/invoices",
  payUPI = "/dashboard/pay-upi-id",
  payzoneAdmin = "/dashboard/payzone-admin",
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
    icon: toll,
    adminOnly: false,
  },
  {
    title: "PAYMENTS",
    href: APP_ROUTES.payments,
    icon: payments,
    adminOnly: false,
  },
  {
    title: "CERTIFICATES",
    href: APP_ROUTES.certificates,
    icon: license,
    adminOnly: false,
  },
  {
    title: "INVOICES",
    href: APP_ROUTES.invoices,
    icon: bill,
    adminOnly: false,
  },
  // {
  //   title: "PAY-UPI ID",
  //   href: APP_ROUTES.payUPI,
  //   icon: send_money,
  //   adminOnly: true,
  // },
  {
    title: "ADMIN",
    href: APP_ROUTES.payzoneAdmin,
    icon: request,
    adminOnly: true,
  },
];

export const REFERRAL_DASHBOARD_SIDEBAR_LINKS = [
  {
    title: "REFERRALS",
    href: APP_ROUTES.referralsDashboard,
    icon: refer, adminOnly: false,
  },
  {
    title: "TRANSACTIONS",
    href: APP_ROUTES.referralsTransactions,
    icon: send_money, adminOnly: false,
  },
  { title: "INVOICES", href: APP_ROUTES.referralsInvoices, icon: bill, adminOnly: false },
  { title: "ADMIN", href: APP_ROUTES.referralsAdmin, icon: admin, adminOnly: true },
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

export const TOKEN_INFO = {
  decimals: 6,
  name: "TMDToken",
  contractAddress: NEXT_PUBLIC_TMD_CONTRACT,
  chainId: chainEnum.baseSepolia,
  burnAddress: "0x000000000000000000000000000000000000dEaD",
  chain: {
    ...baseSepolia,
    blockExplorers: {
      default: {
        name: "BlockScout-BaseSeploia",
        url: "https://base-sepolia.blockscout.com",
      },
    },
  },
};

export const copyUPI = (upiId: string) => {
  navigator.clipboard
    .writeText(upiId)
    .then(() => {
      // console.log("UPI ID copied to clipboard");
      // alert("UPI ID copied to clipboard");
      toast.error("UPI ID copied to clipboard", {
        position: "top-center",
      });
    })
    .catch((err) => {
      console.error("Error copying UPI ID to clipboard:", err);
    });
};
