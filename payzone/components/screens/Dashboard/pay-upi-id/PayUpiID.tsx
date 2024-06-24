"use client";

import { copyUPI } from "@/utils/constants/appInfo";
import { MyServerApi, SERVER_API_ENDPOINTS } from "@/utils/service/MyServerApi";
import { Modal } from "@mui/material";
import {
  TRANSACTIONCATEGORY,
  TRANSACTIONSTATUS,
  TRANSACTIONTYPE,
  USERROLE,
  USERSTATUS,
  USERTYPE,
  User,
} from "@prisma/client";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { ExchangeConfigData } from "@/prisma/extraDbTypes";
import Toast, { toastSeverity } from "../../Referrals/Dashboard/Toast";
import { useSyncBalances } from "@/utils/hooks/useSyncBalances";
import { useAppSelector } from "@/utils/redux/store";
import CurrencyModal from "@/components/global/CurrencyModal";

export const PayUpiID = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const handleModalOpen = () => setModalOpen(true);
  const handleModalClose = () => setModalOpen(false);
  const [payingToUser, setPayingToUser] = useState<any>();
  const [payAmount, setPayAmount] = useState("");
  const [txInfos, setTxInfos] = useState<{
    txStatus: TRANSACTIONSTATUS;
    txType: TRANSACTIONTYPE;
    txCategory: TRANSACTIONCATEGORY;
  }>({
    txStatus: TRANSACTIONSTATUS.DONE,
    txType: TRANSACTIONTYPE.FIAT,
    txCategory: TRANSACTIONCATEGORY.STIPEND,
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: toastSeverity;
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const handleAddPayment = (amount: string) => {
    setLoading(true);
    const _userData = { ...payingToUser };
    _userData.payData = undefined;
    _userData.workData = undefined;
    const updatedData = {
      userId: payingToUser.id,
      user: _userData,
      ...txInfos,
      amount: parseFloat(amount),
    };
    // console.log(updatedData);
    MyServerApi.postData(SERVER_API_ENDPOINTS.payment, updatedData)
      .then((updatedTransaction) => {
        handleModalClose();
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error updating PayTransaction:", error);
      });
  };

  const handleUpdateExchangeRate = () => {
    setExchangeRateUpdating(true);

    const exchangeConfigData: ExchangeConfigData = {
      liquidityINR,
      liquidityTMDCredits,
      creditsRateINR,
    };

    MyServerApi.updateExchangeConfigData(exchangeConfigData)
      .then((data) => {
        console.log("Update successful:", data);
        setToast({
          message: "Exchange rate updated successfully",
          severity: "success",
          open: true,
        });
        setExchangeRateUpdating(false);
        setLiquidityINR(null);
        setLiquidityTMDCredits(null);
        setCreditsRateINR(null);
      })
      .catch((error) => {
        console.error("Error updating data:", error);
        setToast({
          message: "Error updating exchange rate",
          severity: "error",
          open: true,
        });
        setExchangeRateUpdating(false);
        setLiquidityINR(null);
        setLiquidityTMDCredits(null);
        setCreditsRateINR(null);
      });
  };

  useEffect(() => {
    MyServerApi.getAll(
      `${SERVER_API_ENDPOINTS.getUsers}?role=${USERROLE.CORETEAM}&userType=${USERTYPE.MEMBER}&status=${USERSTATUS.ACTIVE}`
    )
      .then((data: any) => {
        setUsers(data?.data?.user as User[]);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }, []);

  const handleClose = (event: any, reason: any) => {
    if (reason === "clickaway") {
      return;
    }
    setToast((prevToast) => ({ ...prevToast, open: false }));
  };

  return (
    <section className="h-screen w-full flex flex-col gap-3">
      <p className="text-thin text-sm text-midGrey">
        copy upi-id and pay in G-Pay/PhonePe/Paytm
      </p>
      <div className="flex flex-row justify-start items-start gap-4 pb-4 max-sm:flex-col">
        <div className="flex flex-col gap-3 w-full">
          {users.map((_user) => (
            <div key={_user.id}>
              <div className="flex h-fit items-center justify-between border border-midGrey p-3">
                <div className="flex flex-col text-midGrey">
                  <span className="lg:text-lg text-neutral-800">
                    {_user.name}
                  </span>
                  <span className="text-xs font-bold">
                    {_user.vertical} |{" "}
                    {dayjs((_user.workData as any)?.joining).format("DD")} of
                    Month
                  </span>
                  <span className="text-xs">
                    {(_user?.payData as any)?.upiId}
                  </span>
                </div>
                <div className="flex flex-col">
                  {(_user.payData as any)?.upiId ? (
                    <span
                      className="font-bold cursor-pointer"
                      onClick={() => copyUPI((_user?.payData as any)?.upiId)}
                    >
                      copy upi-id
                    </span>
                  ) : (
                    <span className="font-bold text-red-600">N/A</span>
                  )}
                  <div
                    className={`bg-black text-white text-xs font-semibold px-2 py-1 cursor-pointer ${
                      loading ? "opacity-50" : ""
                    }`}
                    onClick={() => {
                      handleModalOpen();
                      setPayingToUser(_user);
                      setPayAmount((_user.payData as any).stipend);
                    }}
                  >
                    Add Payment
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>{" "}
      <Toast
        open={toast.open}
        handleClose={handleClose}
        message={toast.message}
        severity={toast.severity}
      />
      <Modal
        open={modalOpen}
        onClose={handleModalClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 lg:w-fit w-2/3 bg-white border-2 border-midGrey shadow-lg p-2 lg:p-4 flex flex-col items-start justify-center">
          <p className="font-semibold text-bgBlack lg:text-3xl w-[20ch] mb-6 text-left ">
            The payment will be added to the user records.
          </p>
          <span> Enter Amount in INR</span>
          <input
            type="text"
            value={payAmount}
            onChange={(e) => {
              console.log(e.target.value);
              setPayAmount(e.target.value);
            }}
            placeholder="Enter Payment Amount"
            className="text-md border-b border-midGrey active:border-b text-neutral-800 py-1 w-full lg:w-80 mb-4"
          />
          <div className="flex gap-4 mb-4">
            <span> Tx Type</span>
            <select
              value={txInfos.txType}
              onChange={(e) =>
                setTxInfos((prevTxInfos) => ({
                  ...prevTxInfos,
                  txType: e.target.value as TRANSACTIONTYPE,
                }))
              }
              className="border border-midGrey p-1"
              id="txType"
            >
              {Object.values(TRANSACTIONTYPE).map((_txType) => (
                <option value={_txType} key={_txType}>
                  {_txType}
                </option>
              ))}
            </select>
            <span> Tx Category</span>
            <select
              value={txInfos.txCategory}
              onChange={(e) =>
                setTxInfos((prevTxInfos) => ({
                  ...prevTxInfos,
                  txCategory: e.target.value as TRANSACTIONCATEGORY,
                }))
              }
              className="border border-midGrey p-1"
              id="txCategory"
            >
              {Object.values(TRANSACTIONCATEGORY).map((_txType) => (
                <option value={_txType} key={_txType}>
                  {_txType}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-4">
            <span> Tx Status</span>
            <select
              value={txInfos.txStatus}
              onChange={(e) =>
                setTxInfos((prevTxInfos) => ({
                  ...prevTxInfos,
                  txStatus: e.target.value as TRANSACTIONSTATUS,
                }))
              }
              className="border border-midGrey p-1"
              id="txStatus"
            >
              {Object.values(TRANSACTIONSTATUS).map((_txType) => (
                <option value={_txType} key={_txType}>
                  {_txType}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm lg:text-base text-midGrey mt-6">
            Are you sure?
          </div>
          <div className="flex gap-4 mt-4">
            <button
              className="bg-black text-white px-2 py-1 w-16"
              onClick={() => handleAddPayment(payAmount)}
            >
              {loading ? "Updating..." : "Yes"}
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
    </section>
  );
};
