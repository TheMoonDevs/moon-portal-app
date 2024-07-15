"use client";

import { useAppSelector } from "@/utils/redux/store";
import { Header } from "../Header";
import PaymentsTable from "./payments-table";
import { PaymentMethod } from "./payments-method";
import useTotalEarned from "@/utils/hooks/useTotalEarned";
import { useEffect, useRef, useState } from "react";
import { MyServerApi, SERVER_API_ENDPOINTS } from "@/utils/service/MyServerApi";
import { TRANSACTIONCATEGORY } from "@prisma/client";
import { useAuthSession } from "@/utils/hooks/useAuthSession";
import Odometer from "@/styles/Odometer";

export const Payments = () => {
  const { user } = useAuthSession();
  const [payTransactions, setPayTransactions] = useState<any[]>([]);
  const { totalEarned } = useTotalEarned(payTransactions);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (user) {
      setLoading(true);
      MyServerApi.getAll(
        `${SERVER_API_ENDPOINTS.getPayments}?userId=${user.id}&txCategory=${TRANSACTIONCATEGORY.STIPEND}`
      )
        .then((data: any) => {
          setPayTransactions(data.data.transactions);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching payment transactions:", error);
          setLoading(false);
        });
    }
  }, [user]);

  return (
    <>
      <Header className="flex flex-col gap-2 ml-7 mt-2">
        <span className="text-sm font-thin text-midGrey">{`Total Earned`}</span>
        {/* <span className="text-4xl font-semibold">{`${totalEarned} INR`}</span> */}
        <Odometer value={totalEarned} /> {/* Use Odometer component here */}
      </Header>
      <section className="p-5 h-full flex max-sm:flex-col max-sm:gap-4 max-sm:p-4">
        <PaymentsTable payTransactions={payTransactions} loading={loading} />
        <section className="flex flex-col gap-4 w-1/3 max-sm:w-full">
          <PaymentMethod />
          {/* <PaymentsProfile /> */}
        </section>
      </section>
    </>
  );
};
