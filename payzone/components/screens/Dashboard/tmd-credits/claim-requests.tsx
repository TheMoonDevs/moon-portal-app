import { TOKEN_INFO } from "@/utils/constants/appInfo";
import { prettyPrintDateInMMMDD } from "@/utils/helpers/prettyprints";
import { useAuthSession } from "@/utils/hooks/useAuthSession";
import { useSyncBalances } from "@/utils/hooks/useSyncBalances";
import { setClaimTransactions } from "@/utils/redux/db/db.slice";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { MyServerApi, SERVER_API_ENDPOINTS } from "@/utils/service/MyServerApi";
import { TRANSACTIONCATEGORY, TRANSACTIONSTATUS } from "@prisma/client";
import Link from "next/link";
import React, { useEffect } from "react";

const ClaimRequests = () => {
  const dispatch = useAppDispatch();
  const claimTransactions = useAppSelector(
    (state) => state.db.claimTransactions
  );
  const { user } = useAuthSession();
  const [loading, setLoading] = React.useState(false);
  const { selectedCurrency, multiplicationFactor } = useSyncBalances();

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    MyServerApi.getAll(
      `${SERVER_API_ENDPOINTS.getPayments}?txCategory=${TRANSACTIONCATEGORY.CLAIM}&userId=${user?.id}`
    )
      .then((data) => {
        console.log("data claims", data);
        dispatch(setClaimTransactions(data.data.transactions));
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching PayTransactions:", error);
        setLoading(false);
      });
  }, [user, dispatch]);

  return (
    <div>
      <div className="h-[35%] p-3 flex flex-col gap-3">
        {/* <span className="font-semibold text-lg">Pending Claim Requests</span> */}
        <div className=" flex flex-col gap-2">
          {claimTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex flex-col border border-midGrey w-full h-fit px-3 py-2 gap-1 rounded-xl"
            >
              <div className="flex justify-between">
                <div className="flex gap-1">
                  <span className="font-medium text-sm">{tx.amount} TMD</span>
                  <span className="font-medium text-sm">=</span>
                  <span className="font-medium text-sm">
                    {multiplicationFactor * tx.amount} {selectedCurrency}
                  </span>
                </div>
                <span className="text-sm font-black">
                  {tx.createdAt
                    ? prettyPrintDateInMMMDD(new Date(tx.createdAt))
                    : ""}
                </span>
              </div>
              <div className="flex justify-between">
                {tx.burnTxHash && (
                  <Link
                    href={`${TOKEN_INFO.chain?.blockExplorers?.default?.url}/tx/${tx.burnTxHash}`}
                    target="_blank"
                  >
                    <span className="text-xs underline hover:text-blue-500">
                      view tx on-chain
                    </span>
                  </Link>
                )}

                <span className="text-xs font-semibold text-orange-900 bg-yellow-300 px-3 py-2 rounded-3xl">
                  Pending
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClaimRequests;
