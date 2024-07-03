import { SkeletonRow } from "@/components/elements/SkeletonRow";
import {
  formatNumberToText,
  prettyPrintISOStringInMMMDDYYYYHHMM,
} from "@/utils/helpers/prettyprints";

const tableHeadings = [
  "Amount",
  "Transaction Type",
  "Trasaction Category",
  "Status",
  "Date & Time",
];

export const PaymentsTable = ({
  payTransactions,
  loading,
}: {
  payTransactions: any[];
  loading: boolean;
}) => {
  return (
    <section className="w-2/3 mx-4 bg-whiteSmoke max-sm:w-full max-sm:mx-0">
      <div className="flex flex-col h-fit p-4 pb-6 border-b border-midGrey">
        <span className="font-semibold text-xl">@UPI-ID / Bank Account</span>
        <span className="text-midGrey">{payTransactions?.length} Payments</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full max-sm:overflow-scroll">
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
          <tbody className="overflow-auto">
            {loading ? (
              <SkeletonRow />
            ) : payTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-4">
                  No payments found.
                </td>
              </tr>
            ) : (
              payTransactions
                ?.filter(
                  (payTransaction: any) => payTransaction.txStatus !== "PENDING"
                )
                .map((transaction: any) => (
                  <tr
                    key={transaction.id}
                    className="border-b-2 border-neutral-200 w-full divide-x-2"
                  >
                    <td className="text-sm p-2 pl-4">
                      {formatNumberToText(transaction.amount)} INR
                    </td>
                    <td className="text-sm p-2">{transaction.txType}</td>
                    <td className="text-sm p-2">{transaction.txCategory}</td>
                    <td className="text-sm p-2">{transaction.txStatus}</td>
                    <td className="text-sm p-2">
                      {prettyPrintISOStringInMMMDDYYYYHHMM(
                        transaction.updatedAt
                      )}
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
export default PaymentsTable;
