"use client";

import { chainEnum, TOKEN_INFO } from "@/utils/constants/appInfo";
import { formatNumberToText } from "@/utils/helpers/prettyprints";
import { useAppSelector } from "@/utils/redux/store";
import { ChainScanner } from "@/utils/service/chainScanner";
import { useCallback, useEffect, useState } from "react";
import { useSyncBalances } from "@/utils/hooks/useSyncBalances";
import { Header } from "../Header";
import CreditsTable from "./credits-table";
import ClaimRequests from "./claim-requests";
import TMDConverter from "./tmd-converter";
import { useAuthSession } from "@/utils/hooks/useAuthSession";
import Image from "next/image";
import { Skeleton } from "@mui/material";

export const Credits = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthSession();
  const userWalletAddress = (user?.payData as any)?.walletAddress;
  const { multiplicationFactor, balance, selectedCurrency } = useSyncBalances();
  const refetchTransactions = useCallback(() => {
    if (userWalletAddress === undefined) return;
    setTransactions([]);
    setLoading(true);
    ChainScanner.fetchAllTransactions(
      TOKEN_INFO.chainId,
      userWalletAddress,
      TOKEN_INFO.contractAddress
    )
      .then((results: any) => {
        let new_chain_results: any[] = [];
        // console.log("results", results);
        results.forEach((results_a: any) => {
          // console.log(results_a, index);
          new_chain_results.push(results_a);
        });
        let res = new_chain_results.flat();
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
      <Header className="flex flex-col gap-2 ml-7 mt-2 ">
        <div className="flex items-center gap-2  ">
          <Image
            src="/icons/CRYPTOCURRENCY.svg"
            width={60}
            height={60}
            alt=""
            className=" rotating-icon duration-300 ease-in !hover:scale-110  "
          />
          <div className="flex flex-col gap-1">
            {!balance ? (
              <>
                <Skeleton
                  variant="text"
                  width={210}
                  height={40}
                  animation="wave"
                  sx={{ backgroundColor: "lightgray" }}
                />
                <Skeleton
                  variant="text"
                  width={210}
                  height={10}
                  animation="wave"
                  sx={{ backgroundColor: "lightgray" }}
                />
              </>
            ) : (
              <>
                <span className="text-4xl font-semibold">{`${balance} TMD Credits`}</span>
                <span className="text-sm font-thin text-midGrey">
                  {`Current Value: ${formatNumberToText(
                    multiplicationFactor * balance
                  )} ${selectedCurrency}`}
                </span>
              </>
            )}
          </div>
        </div>
      </Header>
      <section className="p-5 h-full flex max-sm:flex-col max-sm:gap-4">
        <CreditsTable transactions={transactions} loading={loading} />
        <section className="flex flex-col gap-4 w-1/3 max-sm:w-full">
          <TMDConverter refetchTransactions={refetchTransactions} />
          <ClaimRequests />
        </section>
      </section>
    </>
  );
};
