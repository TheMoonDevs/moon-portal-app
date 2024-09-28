"use client";
import { TOKEN_INFO } from "@/utils/constants/appInfo";
import {
  prettyEthAddress,
  prettyHash,
  prettyPrintDateAndTime,
} from "@/utils/helpers/prettyprints";
import { useAuthSession } from "@/utils/hooks/useAuthSession";
import Image from "next/image";
import Link from "next/link";
import { zeroAddress } from "viem";
import { SkeletonRow } from "@/components/elements/SkeletonRow";
import { useState } from "react";
import ClaimRequests from "./claim-requests";
import { useAppSelector } from "@/utils/redux/store";

enum SelectedTab {
  TMDTxn = "TMDTxn",
  ClaimReq = "ClaimReq",
}

const CreditsTable = ({
  transactions,
  loading,
}: {
  transactions: any[];
  loading: boolean;
}) => {
  const { user } = useAuthSession();
  // const userWalletAddress = (user?.payData as any)?.walletAddress;
  const userWalletAddress = useAppSelector((state) => state.auth.address);
  const [selectedTab, setSelectedTab] = useState<SelectedTab>(
    SelectedTab.TMDTxn
  );
  const tableHeadings = [
    "Amount",
    "Tx Type",
    "Wallet Address",
    "Date & Time",
    "Tx Hash",
  ];
  enum TxType {
    send = "send",
    receive = "receive",
    burn = "burn",
    claim = "claim",
  }
  // console.log(loading);
  return (
    <section className="w-2/3 mx-4 bg-whiteSmoke rounded-3xl max-sm:w-full max-sm:mx-0">
      <div className="flex flex-col h-fit p-4 pb-6 border-b border-midGrey relative">
        <div className="flex justify-between flex-col md:flex-row">
          <div>
            <span className="font-semibold text-xl">
              {selectedTab == SelectedTab.TMDTxn
                ? "TMD CREDITS - Inbound/Outbound"
                : "CRYPTO to FIAT - Pending Claim Requests"}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {prettyEthAddress(userWalletAddress)}
              </span>
              {selectedTab == SelectedTab.TMDTxn && (
                <span className="text-midGrey">
                  {transactions.length} transactions
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 w-72">
            <button
              onClick={() => {
                setSelectedTab(SelectedTab.TMDTxn);
              }}
              className={`px-3 py-1 rounded-3xl border border-black w-full ${
                selectedTab == SelectedTab.TMDTxn
                  ? "text-white bg-black hover:text-black hover:bg-white"
                  : "text-black bg-white hover:text-white hover:bg-black"
              }`}
            >
              TMD txn
            </button>
            <button
              onClick={() => {
                setSelectedTab(SelectedTab.ClaimReq);
              }}
              className={` px-3 py-1 rounded-3xl border border-black w-full ${
                selectedTab == SelectedTab.ClaimReq
                  ? "text-white bg-black hover:text-black hover:bg-white"
                  : "text-black bg-white hover:text-white hover:bg-black"
              } `}
            >
              Claim Req
            </button>
          </div>
        </div>
      </div>
      {selectedTab == SelectedTab.TMDTxn && (
        <div className="w-full h-[70vh] overflow-y-scroll">
          <table className="w-full">
            <thead className="border-b border-midGrey w-full">
              <tr className=" w-full bg-neutral-100 rounded-lg divide-x-2">
                {tableHeadings.map((heading) => (
                  <th
                    key={heading}
                    className="text-md font-semibold text-neutral-800 text-left p-2 pl-4"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRow />
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4">
                    No payments found.
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr
                    key={transaction.hash}
                    className="border-b-2 border-neutral-200 w-full divide-x-2"
                  >
                    <td className="text-sm p-2 pl-4">
                      <Image
                        src="/icons/CRYPTOCURRENCY.svg"
                        width={20}
                        height={20}
                        alt=""
                      />{" "}
                      {transaction.value / 10 ** 18} TMD
                    </td>
                    <td className="text-sm p-2">
                      {transaction.to === userWalletAddress?.toLowerCase()
                        ? TxType.receive
                        : transaction.to === TOKEN_INFO.burnAddress
                        ? TxType.claim
                        : TxType.send}
                    </td>
                    <td className="text-sm p-2">
                      {transaction.to !== userWalletAddress?.toLowerCase()
                        ? prettyEthAddress(transaction.to)
                        : transaction.from === zeroAddress
                        ? "TheMoonDevs 0x"
                        : prettyEthAddress(transaction.from)}
                    </td>
                    <td className="text-sm p-2">
                      {prettyPrintDateAndTime(transaction.timeStamp)}
                    </td>
                    <td className="text-sm p-2 hover:underline">
                      <Link
                        href={`${TOKEN_INFO.chain?.blockExplorers?.default?.url}/tx/${transaction.hash}`}
                        target={"_blank"}
                      >
                        {prettyHash(transaction.hash)}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {selectedTab == SelectedTab.ClaimReq && <ClaimRequests />}
    </section>
  );
};

export default CreditsTable;
