/* eslint-disable @next/next/no-img-element */
"use client";

import { TOKEN_INFO } from "@/utils/constants/appInfo";
import useReadContract from "@/utils/hooks/useReadContract";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import TMDToken from "../../../../contract/artifacts/contracts/TMDToken.sol/TMDToken.json";
import { formatNumberToText } from "@/utils/helpers/prettyprints";
import { useEffect } from "react";
import {
  setBalance,
  setTotalEarned,
} from "@/utils/redux/balances/balances.slice";
import { useAuthSession } from "@/utils/hooks/useAuthSession";

interface HeaderProps {
  children?: React.ReactNode;
  className?: string;
}

export const Header = ({ children, className }: HeaderProps) => {
  const { user } = useAuthSession();
  const dispatch = useAppDispatch();

  const tokenData = useReadContract({
    address: TOKEN_INFO.contractAddress,
    abi: TMDToken.abi,
  });

  useEffect(() => {
    const formattedBalance = Number(tokenData?.balance) / 10 ** 18;
    dispatch(setBalance(formattedBalance));
  }, [tokenData, dispatch]);

  useEffect(() => {
    const formattedTotalEarned =
      formatNumberToText(
        "0"
        // payTransactions?.filter((payTransaction: any)=> payTransaction.txStatus !== "PENDING").reduce(
        //   (total: number, transaction: any) => total + transaction.amount,
        //   0
        // )
      ) || "0";
    dispatch(setTotalEarned(formattedTotalEarned));
  }, [dispatch]);

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
