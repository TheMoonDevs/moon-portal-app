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

export const PayUpiID = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const handleModalOpen = () => setModalOpen(true);
  const handleModalClose = () => setModalOpen(false);
  const [payingToUser, setPayingToUser] = useState<any>();
  const [payAmount, setPayAmount] = useState("");
  const [exchangeRateUpdating, setExchangeRateUpdating] =
    useState<boolean>(false);
  const [liquidityINR, setLiquidityINR] = useState<number | null>();
  const [liquidityTMDCredits, setLiquidityTMDCredits] = useState<
    number | null
  >();
  const [creditsRateINR, setCreditsRateINR] = useState<number | null>();
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
  const { multiplicationFactor } = useSyncBalances();
  const currency = useAppSelector((state) => state.balances.selectedCurrency);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] =
    useState<boolean>(false);

  const handleAddPayment = (amount: string) => {
    setLoading(true);
    const _userData = { ...payingToUser };
    _userData.payData = undefined;
    _userData.workData = undefined;
    const updatedData = {
      userId: payingToUser.id,
      user: _userData,
      txStatus: TRANSACTIONSTATUS.DONE,
      txType: TRANSACTIONTYPE.FIAT,
      txCategory: TRANSACTIONCATEGORY.STIPEND,
      amount: amount,
    };
    // console.log(updatedData);
    MyServerApi.updateData(SERVER_API_ENDPOINTS.updatePayment, updatedData)
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
<<<<<<< HEAD
    <section className="h-screen w-full p-4 flex flex-col gap-3">
      <div className="w-fit h-fit bg-black text-white text-sm font-bold p-2 items-center">
        <span>Employees -- UPI Ids</span>
      </div>
=======
    <section className="h-screen w-full flex flex-col gap-3 max-lg:h-full">
>>>>>>> main
      <p className="text-thin text-sm text-midGrey">
        copy upi-id and pay in G-Pay/PhonePe/Paytm
      </p>
      <div className="flex flex-row justify-start items-start gap-4 pb-4 max-sm:flex-col">
        <div className="flex flex-col gap-3 w-2/3 max-sm:w-full">
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
                </div>
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
              </div>
              <div className="flex justify-end">
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
                  Mark Payment Sent
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-whiteSmoke h-fit flex flex-col p-4 justify-between gap-4 w-1/3 max-sm:w-full">
          <span className="flex justify-between">
            <p className="text-sm font-thin">Current Price</p>
            <p
              className="text-sm font-black px-2 py-1 border border-black cursor-pointer"
              onClick={() => setIsCurrencyModalOpen(true)}
            >
              1 TMD === {multiplicationFactor} {currency}
            </p>
          </span>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateExchangeRate();
            }}
          >
            <div className="flex flex-col gap-2">
              <input
                type="number"
                className="w-full h-10 p-2 border border-midGrey"
                placeholder="Enter Liquidity in INR"
                value={liquidityINR || ""}
                onChange={(e) => setLiquidityINR(Number(e.target.value))}
                disabled={exchangeRateUpdating}
              />
              <input
                type="number"
                className="w-full h-10 p-2 border border-midGrey"
                placeholder="Enter Liquidity TMD Credits"
                value={liquidityTMDCredits || ""}
                onChange={(e) => setLiquidityTMDCredits(Number(e.target.value))}
                disabled={exchangeRateUpdating}
              />
              <input
                type="number"
                className="w-full h-10 p-2 border border-midGrey"
                placeholder="Enter Exchange Rate in INR"
                value={creditsRateINR || ""}
                onChange={(e) => setCreditsRateINR(Number(e.target.value))}
                disabled={exchangeRateUpdating}
              />

              <button
                className={`text-sm font-black w-full h-10 text-whiteSmoke bg-black ${
                  exchangeRateUpdating && "opacity-50"
                }`}
                type="submit"
                disabled={
                  exchangeRateUpdating ||
                  !liquidityINR ||
                  !liquidityTMDCredits ||
                  !creditsRateINR
                }
              >
                Set Exchange Rate
              </button>
            </div>
          </form>
        </div>
      </div>{" "}
      <Toast
        open={toast.open}
        handleClose={handleClose}
        message={toast.message}
        severity={toast.severity}
      />
      <CurrencyModal
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
      />
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
          <input
            type="text"
            value={payAmount}
            onChange={(e) => {
              console.log(e.target.value);
              setPayAmount(e.target.value);
            }}
            placeholder="Enter Payment Amount"
            className="my-2 p-2 text-md border-b border-midGrey active:border-b text-neutral-800 px-2 py-1 w-full lg:w-80 mb-4"
          />
          <div className="text-sm lg:text-base text-midGrey">Are you sure?</div>
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
