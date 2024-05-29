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

export const PayUpiID = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const handleModalOpen = () => setModalOpen(true);
  const handleModalClose = () => setModalOpen(false);
  const [payingToUser, setPayingToUser] = useState<any>();
  const [payAmount, setPayAmount] = useState("");

  const [loading, setLoading] = useState(false);

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

  return (
    <section className="h-screen w-full p-4 flex flex-col gap-3">
      <div className="w-fit h-fit bg-black text-white text-sm font-bold p-2 items-center">
        <span>Employees -- UPI Ids</span>
      </div>
      <p className="text-thin text-sm text-midGrey">
        copy upi-id and pay in G-Pay/PhonePe/Paytm
      </p>
      <div>
        <div className="flex flex-col w-full gap-3">
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
            <div className="text-sm lg:text-base text-midGrey">
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
      </div>
    </section>
  );
};
