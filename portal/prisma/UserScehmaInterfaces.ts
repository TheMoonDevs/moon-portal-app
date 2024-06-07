export interface personalData {
  phone?: number;
  upiId?: string;
  dateOfBirth?: any;
  city?: string;
  position?: string;
  workHourOverlap?: string;
  address?: string;
  avatar?: string;
  banner?: string;
}

export interface workData {
  joining?: any;
  workHours?: string;
  positionPublic?: string;
  positionInternal?: string;
  grade?: number;
  gradeTag?: string;
}

export interface PayData {
  upiId?: string;
  payMethod?: string;
  walletAddress?: string;
  stipendWalletAddress?: string;
  stipendAmount?: string;
  stipendCurrency?: string;
}
