"use client";
import { TOKEN_INFO } from "@/utils/constants/appInfo";
import {
  prettyEthAddress,
  prettyHash,
  prettyPrintDateAndTime,
} from "@/utils/helpers/prettyprints";
import { useAuthSession } from "@/utils/hooks/useAuthSession";
import { useAppSelector } from "@/utils/redux/store";
import Image from "next/image";
import Link from "next/link";
import { zeroAddress } from "viem";
import { SkeletonRow } from "@/components/elements/SkeletonRow";

const CreditsTable = ({
  transactions,
  loading,
}: {
  transactions: any[];
  loading: boolean;
}) => {
  const { user } = useAuthSession();
  const userWalletAddress = (user?.payData as any)?.walletAddress;

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
  console.log(loading);
  return (
    <section className="w-2/3 mx-4 bg-whiteSmoke">
      <div className="flex flex-col h-fit p-4 pb-6 border-b border-midGrey">
        <span className="font-semibold text-xl">
          TMD CREDITS - Inbound/Outbound
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm">{prettyEthAddress(userWalletAddress)}</span>
          <span className="text-midGrey">
            {transactions.length} transactions
          </span>
        </div>
      </div>
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
    </section>
  );
};

export default CreditsTable;
