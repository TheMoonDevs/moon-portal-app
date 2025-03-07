import { USERROLE, USERVERTICAL } from "@prisma/client";

export const roleImageMap: Record<USERROLE, string> = {
  CORETEAM: "/images/status/coreteam.jpeg",
  ASSOCIATE: "/images/status/associate.jpeg",
  FREELANCER: "/images/status/freelancer.jpeg",
  INTERN: "/images/status/intern.jpeg",
  TRIAL_CANDIDATE: "/images/status/trial.jpeg",
};

export const verticalImageMap: Record<USERVERTICAL, string> = {
  DEV: "/images/roles/developer.jpeg",
  DESIGN: "/images/roles/Designer.jpeg",
  MARKETING: "/images/roles/marketing.jpeg",
  COMMUNITY: "/images/roles/community.jpeg",
  FINANCE: "/images/roles/finance.jpeg",
  LEGAL: "/images/roles/legal.jpeg",
  HR: "/images/roles/hr.jpeg",
  OPERATIONS: "/images/roles/operations.jpeg",
};

export const getUserRoleImage = (role: USERROLE | null) =>
  role ? roleImageMap[role] || "/images/default.jpeg" : "/images/default.jpeg";

export const getUserVerticalImage = (vertical: USERVERTICAL | null) =>
  vertical
    ? verticalImageMap[vertical] || "/images/default.jpeg"
    : "/images/default.jpeg";

export const translateUserVertical = (vertical: string): string => {
  const verticalMap: { [key: string]: string } = {
    DEV: "Developer",
    DESIGN: "Designer",
    MARKETING: "Marketing",
    COMMUNITY: "Community Manager",
    FINANCE: "Finance Specialist",
    LEGAL: "Legal Specialist",
    HR: "Human Resources",
    OPERATIONS: "Operations",
  };
  return verticalMap[vertical] || "Unknown Vertical";
};

export const truncateAddress = (
  address: string | undefined,
  visibleChars: number = 4
): string => {
  if (!address) return "Not Available";
  if (address.length <= visibleChars * 2) return address;
  return `${address.slice(0, visibleChars)}...${address.slice(-visibleChars)}`;
};