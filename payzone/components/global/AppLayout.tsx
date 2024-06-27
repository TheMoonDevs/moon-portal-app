"use client";

import { useAuthSession } from "@/utils/hooks/useAuthSession";
import { useSyncBalances } from "@/utils/hooks/useSyncBalances";
import { setExchange } from "@/utils/redux/balances/balances.slice";
import { useAppDispatch } from "@/utils/redux/store";
import { useEffect } from "react";

export const AppLayout = ({ children, exchangeData }: any) => {
  useAuthSession(true);
  const dispatch = useAppDispatch();
  useSyncBalances(true)

  return <>{children}</>;
};
