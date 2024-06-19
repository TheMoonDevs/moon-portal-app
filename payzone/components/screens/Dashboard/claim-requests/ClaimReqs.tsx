"use client";

import { TOKEN_INFO, copyUPI } from "@/utils/constants/appInfo";
import { useAuthSession } from "@/utils/hooks/useAuthSession";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { MyServerApi, SERVER_API_ENDPOINTS } from "@/utils/service/MyServerApi";
import { Modal } from "@mui/material";
import {
  PayTransactions,
  TRANSACTIONCATEGORY,
  TRANSACTIONSTATUS,
} from "@prisma/client";
import Link from "next/link";
import { useEffect, useState } from "react";

export const ClaimReqs = () => {
  const [claims, setClaims] = useState<PayTransactions[]>([]);
  const { user } = useAuthSession();
  const dispatch = useAppDispatch();
  const bscScanUrl = "https://testnet.bscscan.com/tx/";
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const handleModalOpen = () => setModalOpen(true);
  const handleModalClose = () => setModalOpen(false);
  const [claimId, setClaimId] = useState("");

  const handleAddPayment = (id: string) => {
    setLoading(true);
    const updatedData = {
      id: id,
      txStatus: TRANSACTIONSTATUS.DONE,
    };

    // console.log(updatedData);
    MyServerApi.updateTransaction(updatedData)
      .then(() => {
        handleModalClose();
        setLoading(false);
        alert("Payment marked as DONE");
        setClaims((prev) => prev.filter((claim) => claim.id !== id));
      })
      .catch((error) => {
        console.error("Error updating PayTransaction:", error);
      });
  };

  useEffect(() => {
    MyServerApi.getAll(
      `${SERVER_API_ENDPOINTS.getPayments}?txCategory=${TRANSACTIONCATEGORY.CLAIM}&txStatus=${TRANSACTIONSTATUS.PROCESSING}`
    )
      .then((data: any) => {
        setClaims(data?.data?.transactions as PayTransactions[]);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }, []);

  return (
    <section className="h-screen w-full p-4 flex flex-col gap-3 max-lg:h-full">
      <div className="w-fit h-fit bg-black text-white text-sm font-bold p-2 items-center">
        <span>TMD - Claim Requests</span>
      </div>
      <p className="text-thin text-sm text-midGrey">
        copy upi-id and pay in G-Pay/PhonePe/Paytm
      </p>
      <div className="flex flex-col gap-4">
        {claims.map((claim) => (
          <div key={claim.burnTxHash} className="flex flex-col">
            <div className="flex w-full h-fit items-center justify-between border border-midGrey p-3">
              <div className="flex flex-col text-midGrey">
                <span className="lg:text-lg">{(claim.user as any)?.name}</span>
                <span className="text-xs font-bold">
                  {claim.amount} TMD === {claim.amount} INR
                </span>
              </div>
              <span
                className="font-bold cursor-pointer"
                onClick={() =>
                  copyUPI(((claim.user as any)?.payData as any)?.upiId)
                }
              >
                copy upi-id
              </span>
            </div>
            <div className="w-full h-fit flex justify-between">
              <Link
                className="bg-black text-white text-xs font-semibold px-2 py-1"
                href={`${TOKEN_INFO.chain.blockExplorers.default.url}/tx/${claim.burnTxHash}`}
                target="_blank"
              >
                Verify Tx
              </Link>
              <div
                className={`bg-black text-white text-xs font-semibold px-2 py-1 cursor-pointer ${
                  loading ? "opacity-50" : ""
                }`}
                onClick={() => {
                  handleModalOpen();
                  setClaimId(claim.id);
                }}
              >
                Mark Payment Sent
              </div>
            </div>
          </div>
        ))}
        <Modal
          open={modalOpen}
          onClose={handleModalClose}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 lg:w-fit w-2/3 bg-white border-2 border-midGrey shadow-lg p-2 lg:p-4 flex flex-col items-center justify-center">
            <p className="font-semibold text-bgBlack lg:text-lg text-center ">
              The payment will be marked as complete.
            </p>
            <div className="text-sm lg:text-base text-midGrey">
              Are you sure?
            </div>
            <div className="flex gap-4 mt-4">
              <button
                className="bg-black text-white px-2 py-1 w-16"
                onClick={() => handleAddPayment(claimId)}
              >
                Yes
              </button>
              <button
                className="bg-black text-white px-2 py-1 w-16"
                onClick={handleModalClose}
              >
                No
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </section>
  );
};
