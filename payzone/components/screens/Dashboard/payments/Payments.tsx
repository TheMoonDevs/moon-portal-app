"use client";

import { useAppSelector } from "@/utils/redux/store";
import { Header } from "../Header";
import PaymentsTable from "./payments-table";
import { PaymentMethod } from "./payments-method";
import useTotalEarned from "@/utils/hooks/useTotalEarned";
import { useEffect, useState } from "react";
import { MyServerApi, SERVER_API_ENDPOINTS } from "@/utils/service/MyServerApi";
import { TRANSACTIONCATEGORY } from "@prisma/client";
import { useAuthSession } from "@/utils/hooks/useAuthSession";

export const Payments = () => {
  const { user } = useAuthSession();
  const [payTransactions, setPayTransactions] = useState<any[]>([]);
  const { totalEarned } = useTotalEarned(payTransactions);
  useEffect(() => {
    if (user) {
      MyServerApi.getAll(
        `${SERVER_API_ENDPOINTS.getPayments}?userId=${user.id}&txCategory=${TRANSACTIONCATEGORY.STIPEND}`
      )
        .then((data: any) => {
          setPayTransactions(data.data.transactions);
        })
        .catch((error) => {
          console.error("Error fetching payment transactions:", error);
        });
    }
  }, [user]);
  return (
    <>
      <Header className="flex flex-col gap-2 ml-7 mt-2">
        <span className="text-4xl font-semibold">{`${totalEarned} INR`}</span>
        <span className="text-sm font-thin text-midGrey">{`Total Earned`}</span>
      </Header>
      <section className="p-5 h-full flex">
        <PaymentsTable payTransactions={payTransactions} />
        <section className="flex flex-col gap-4 w-1/3">
          <PaymentMethod />
          {/* <PaymentsProfile /> */}
        </section>
      </section>
    </>
  );
};
