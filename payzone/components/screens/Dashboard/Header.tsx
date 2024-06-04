/* eslint-disable @next/next/no-img-element */
"use client";

import { TOKEN_INFO } from "@/utils/constants/appInfo";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { formatNumberToText } from "@/utils/helpers/prettyprints";
import { useEffect } from "react";
import {
  setBalance,
  setTotalEarned,
} from "@/utils/redux/balances/balances.slice";
import { useAuthSession } from "@/utils/hooks/useAuthSession";
import { Address } from "viem";
import { useSyncBalances } from "@/utils/hooks/useSyncBalances";

interface HeaderProps {
  children?: React.ReactNode;
  className?: string;
}

export const Header = ({ children, className }: HeaderProps) => {
  const { user } = useAuthSession();
  useSyncBalances(true);

  return (
    <section className="hidden lg:flex justify-between items-center w-full h-[15%] p-4 pb-0">
      <div className={className}>{children}</div>
      <div className=" border-black border flex items-center justify-end gap-5 py-1 px-3">
        <span className="text-md max-w-20 font-semibold tracking-widest">
          {user?.name}
        </span>
        <img
          src={user?.avatar as string}
          alt=""
          className="w-10 h-10 rounded-full object-cover"
        />
      </div>
    </section>
  );
};
