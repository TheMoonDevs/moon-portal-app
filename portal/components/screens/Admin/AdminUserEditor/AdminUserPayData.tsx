"use client";

import { LandscapeCard } from "@/components/elements/Cards";
import { ChangeEvent, Dispatch, SetStateAction } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { User } from "@prisma/client";

export const AdminUserPayData = ({
  user,
  setUser,
  updateField,
  updateOverlap,
}: {
  user: User;
  setUser: Dispatch<SetStateAction<User>>;
  updateField: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  updateOverlap: (index: number, field: string, value: any) => void;
}) => {
  return (
    <LandscapeCard className="items-start justify-start">
      <div className="flex flex-col mb-8 gap-4 items-center justify-start">
        <p className="text-neutral-400 tracking-[0.5em] uppercase text-xs text-center">
          PAY DATA
        </p>
      </div>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <div className="flex flex-row items-start justify-start gap-8">
          {/* Left Column */}
          <div className="flex flex-col grow gap-4 items-start justify-start">
            <div className="flex flex-row gap-4 items-center justify-start">
              <p className="w-40">UPI ID</p>
              <input
                id="payData.upiId"
                type="text"
                value={(user?.payData as any)?.upiId}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              />
            </div>
            <div className="flex flex-row gap-4 items-center justify-start">
              <p className="w-40">Pay Method</p>
              <input
                id="payData.payMethod"
                type="text"
                value={(user?.payData as any)?.payMethod}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              />
            </div>
            <div className="flex flex-row gap-4 items-center justify-start">
              <p className="w-40">Wallet Address</p>
              <input
                id="payData.walletAddress"
                type="text"
                value={(user?.payData as any)?.walletAddress}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              />
            </div>
          </div>
          {/* Right Column */}
          <div className="flex flex-col grow gap-4 items-start justify-start ml-12">
            <div className="flex flex-row gap-4 items-center justify-start">
              <p className="w-40">Stipend Wallet Address</p>
              <input
                id="payData.stipendWalletAddress"
                type="text"
                value={(user?.payData as any)?.stipendWalletAddress}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              />
            </div>
            <div className="flex flex-row gap-4 items-center justify-start">
              <p className="w-40">Stipend Amount</p>
              <input
                id="payData.stipendAmount"
                type="text"
                value={(user?.payData as any)?.stipendAmount}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              />
            </div>
            <div className="flex flex-row gap-4 items-center justify-start">
              <p className="w-40">Stipend Currency</p>
              <input
                id="payData.stipendCurrency"
                type="text"
                defaultValue="INR"
                value={(user?.payData as any)?.stipendCurrency}
                onChange={updateField}
                className="border border-neutral-400 rounded-lg p-2"
              />
            </div>
          </div>
        </div>
      </LocalizationProvider>
    </LandscapeCard>
  );
};
