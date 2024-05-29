"use client";

import { setUser } from "@/utils/redux/auth/auth.slice";
import { useAppSelector } from "@/utils/redux/store";
import { MyServerApi, SERVER_API_ENDPOINTS } from "@/utils/service/MyServerApi";
import { TRANSACTIONCATEGORY, User } from "@prisma/client";
import { useEffect, useState } from "react";
import { useAppDispatch } from "@/utils/redux/store";
import { useAuthSession } from "@/utils/hooks/useAuthSession";

interface UserData {
  data: {
    user: User;
  };
}

export const PaymentMethod = () => {
  const { user } = useAuthSession();
  const [paymentMethod, setPaymentMethod] = useState("UPI-ID");
  const [upiId, setUpiId] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const dispatch = useAppDispatch();
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setUpiId("");
    setWalletAddress("");
  }, [user]);

  const handleUpdatePaymentMethod = () => {
    setUpdating(true);
    const payData = {
      ...(user?.payData as object),
      upiId: paymentMethod === "UPI-ID" ? upiId : (user?.payData as any)?.upiId,
      walletAddress:
        paymentMethod === "Crypto"
          ? walletAddress
          : (user?.payData as any)?.walletAddress,
    };

    MyServerApi.updateData(`${SERVER_API_ENDPOINTS.updateUser}${user?.id}`, {
      payData,
    })
      .then((data: unknown) => {
        const userData = (data as UserData).data.user;
        dispatch(setUser(userData));
        setUpiId("");
        setWalletAddress("");
        setUpdating(false);
      })
      .catch((error: unknown) => {
        console.error("Error:", error);
        setUpdating(false);
      });
  };

  return (
    <div className="flex flex-col p-4 justify-between bg-whiteSmoke">
      <div className="flex flex-col gap-4">
        <span className="flex justify-between items-center">
          <p className="text-md font-semibold">Preferred Payment Method</p>
          <div className="flex gap-2 items-center">
            <p className="text-sm font-black">
              {(user?.payData as any)?.prefPayMthd}
            </p>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="bg-black text-white px-2 py-1 rounded-md"
            >
              <option value="UPI-ID">UPI-ID</option>
              <option value="Crypto">Crypto</option>
            </select>
          </div>
        </span>
        {paymentMethod === "UPI-ID" ? (
          <span className="flex flex-col gap-1">
            <p className="text-sm">My UPI-ID : </p>
            <p className="text-sm font-bold">{(user?.payData as any)?.upiId}</p>
          </span>
        ) : (
          <span className="flex flex-col gap-1">
            <p className="text-sm">My Wallet Address : </p>
            <p className="text-sm font-bold ">
              {(user?.payData as any)?.walletAddress}
            </p>
          </span>
        )}
      </div>
      <div className="flex gap-2 mt-6">
        {paymentMethod === "UPI-ID" ? (
          <input
            type="text"
            className="w-8/12 h-10 p-2 border border-midGrey"
            placeholder="Input new Upi-Id"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
          />
        ) : (
          <input
            type="text"
            className="w-8/12 h-10 p-2 border border-midGrey"
            placeholder="Input new Wallet Address"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
          />
        )}
        {!updating ? (
          <button
            className="text-sm font-black w-1/3 text-whiteSmoke bg-black"
            onClick={handleUpdatePaymentMethod}
          >
            Update
          </button>
        ) : (
          <button
            className="text-sm font-black w-1/3 text-whiteSmoke bg-black"
            disabled
          >
            Updating...
          </button>
        )}
      </div>
    </div>
  );
};

export default PaymentMethod;
