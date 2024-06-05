"use client";

import { useAuthSession } from "@/utils/hooks/useAuthSession";
import { setExchange } from "@/utils/redux/balances/balances.slice";
import { useAppDispatch } from "@/utils/redux/store";
import { useEffect } from "react";

export const AppLayout = ({ children, exchangeData }: any) => {
  useAuthSession(true);
  const dispatch = useAppDispatch();

  useEffect(() => {
    fetch("/api/exchange")
      .then((res) => res.json())
      .then((data) => {
        console.log("data", data);
        dispatch(setExchange(data.data));
      })
      .catch((error) => {
        console.error("Error fetching exchange data:", error);
      });
  }, []);

  return <>{children}</>;
};
