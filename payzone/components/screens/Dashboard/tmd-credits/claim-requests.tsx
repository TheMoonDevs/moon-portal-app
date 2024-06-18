import { MyServerApi, SERVER_API_ENDPOINTS } from "@/utils/service/MyServerApi";
import { TRANSACTIONCATEGORY, TRANSACTIONSTATUS } from "@prisma/client";
import React, { useEffect } from "react";

const ClaimRequests = () => {
  const [claimRequests, setClaimRequests] = React.useState([]);

  useEffect(() => {
    MyServerApi.getAll(
      `${SERVER_API_ENDPOINTS.getPayments}?txCategory=${TRANSACTIONCATEGORY.CLAIM}&txStatus=${TRANSACTIONSTATUS.PENDING}`
    )
      .then((data) => {
        console.log("data", data);
        setClaimRequests(data.data);
      })
      .catch((error) => {
        console.error("Error fetching PayTransactions:", error);
      });
  }, []);

  return (
    <div>
      <div className="h-[35%] p-3 flex flex-col gap-3">
        <span className="font-semibold text-lg">Pending Claim Requests</span>
        <div>
          <div className="flex flex-col border border-midGrey w-full h-14 px-2 py-1 gap-1">
            <div className="flex justify-between">
              <div className="flex gap-1">
                <span className="font-medium text-sm">1,232 TMD</span>
                <span className="font-medium text-sm">=</span>
                <span className="font-medium text-sm">1,232 INR</span>
              </div>
              <span className="text-sm font-black">March 11</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs underline">view tx on-chain</span>
              <span className="text-xs font-black text-white bg-yellow-400 px-3">
                pending
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimRequests;
