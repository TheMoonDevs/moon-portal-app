"use client";

import { chainEnum, TOKEN_INFO } from "@/utils/constants/appInfo";
import { formatNumberToText } from "@/utils/helpers/prettyprints";
import { useAppSelector } from "@/utils/redux/store";
import { ChainScanner } from "@/utils/service/chainScanner";
import { useCallback, useEffect, useState } from "react";

import { Header } from "../Header";
import CreditsTable from "./credits-table";
import ClaimRequests from "./claim-requests";
import TMDConverter from "./tmd-converter";
import { useAuthSession } from "@/utils/hooks/useAuthSession";

export const Credits = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthSession();
  const userWalletAddress = (user?.payData as any)?.walletAddress;
  const { balance } = useAppSelector((state) => state.balances);
  const refetchTransactions = useCallback(() => {
    if (userWalletAddress === undefined) return;
    setTransactions([]);
    setLoading(true);
    new Promise((resolve, reject) => {
      ChainScanner.fetchAllTransactions(
        TOKEN_INFO.chainId,
        userWalletAddress,
        TOKEN_INFO.contractAddress
      )
        .then(resolve)
        .catch(reject);
    })
      .then((results: any) => {
        let new_chain_results: any[] = [];
        // console.log("results", results);
        results.forEach((results_a: any) => {
          // console.log(results_a, index);
          new_chain_results.push(results_a);
        });
        let res = new_chain_results.flat();
        //console.log("transactions", res, walletAddress);
        // res = res.filter(
        //   (tx: any) =>
        //     tx.from.toUpperCase() === walletAddress.toUpperCase() ||
        //     tx.to.toUpperCase() === walletAddress.toUpperCase()
        // );
        // console.log("my transactions", res);
        res = res.sort((a: any, b: any) => b.timeStamp - a.timeStamp);
        setTransactions(res);
        setLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);
      });
  }, [userWalletAddress]);

  useEffect(() => {
    refetchTransactions();
  }, [refetchTransactions]);

  return (
    <>
      <Header className="flex flex-col gap-2 ml-7 mt-2">
        <div className="flex items-center">
          <span className="text-4xl font-semibold">{`${balance} TMD Credits`}</span>
        </div>
        <span className="text-sm font-thin text-midGrey">
          {`Current Value: ${formatNumberToText(balance)} INR`}
        </span>
      </Header>
      <section className="p-5 h-full flex">
        <CreditsTable transactions={transactions} />
        <section className="flex flex-col gap-4 w-1/3">
          <TMDConverter refetchTransactions={refetchTransactions} />
          <ClaimRequests />
        </section>
      </section>
    </>
  );
};
