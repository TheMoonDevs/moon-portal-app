"use client";

import { LandscapeCard } from "@/components/elements/Cards";
import { ChangeEvent, Dispatch, SetStateAction } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { User } from "@prisma/client";
import { Spinner } from "@/components/elements/Loaders";

export const AdminUserPayData = ({
  user,
  setUser,
  updateField,
  updateOverlap,
  saveUser,
  loading,
}: {
  user: User;
  setUser: Dispatch<SetStateAction<User>>;
  updateField: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  updateOverlap: (index: number, field: string, value: any) => void;
  saveUser: () => void;
  loading: boolean;
}) => {
  return (
    <LandscapeCard className="@shadow-lg !h-[90vh] !w-full items-start justify-start !rounded-xl !bg-gray-900 !p-6">
      {" "}
      <div className="mb-6 flex w-full items-center justify-between border-b border-gray-700 pb-4">
        {" "}
        <p className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
          PAY DATA
        </p>
        <button
          onClick={saveUser}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white shadow-md transition hover:bg-green-700"
        >
          {loading && <Spinner className="h-5 w-5 text-green-600" />}
          {!loading && <span className="material-icons">done_all</span>}
          Save User
        </button>
      </div>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <div className="grid w-full grid-cols-2 gap-8">
          {" "}
          {/* Left Column */}
          <div className="flex flex-col gap-4 text-white shadow-lg">
            {" "}
            <div className="flex flex-col gap-2">
              {" "}
              <p className="mb-1 text-sm text-gray-300">UPI ID</p>
              <input
                id="payData.upiId"
                type="text"
                value={(user?.payData as any)?.upiId}
                onChange={updateField}
                className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              {" "}
              <p className="mb-1 text-sm text-gray-300">Pay Method</p>
              <input
                id="payData.payMethod"
                type="text"
                value={(user?.payData as any)?.payMethod}
                onChange={updateField}
                className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              {" "}
              <p className="mb-1 text-sm text-gray-300">Wallet Address</p>
              <input
                id="payData.walletAddress"
                type="text"
                value={(user?.payData as any)?.walletAddress}
                onChange={updateField}
                className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          {/* Right Column */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {" "}
              <p className="mb-1 text-sm text-gray-300">
                Stipend Wallet Address
              </p>
              <input
                id="payData.stipendWalletAddress"
                type="text"
                value={(user?.payData as any)?.stipendWalletAddress}
                onChange={updateField}
                className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              {" "}
              <p className="mb-1 text-sm text-gray-300">Stipend Amount</p>
              <input
                id="payData.stipendAmount"
                type="text"
                value={(user?.payData as any)?.stipendAmount}
                onChange={updateField}
                className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              {" "}
              <p className="mb-1 text-sm text-gray-300">Stipend Currency</p>
              <input
                id="payData.stipendCurrency"
                type="text"
                defaultValue="INR"
                value={(user?.payData as any)?.stipendCurrency}
                onChange={updateField}
                className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </LocalizationProvider>
    </LandscapeCard>
  );
};
