import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../redux/store";
import { MyServerApi, SERVER_API_ENDPOINTS } from "../service/MyServerApi";
import { setRefreshPayTransactions } from "../redux/db/db.slice";

export const useUserTransactions = () => {
  const payTransactions = useAppSelector((state) => state.db.payTransaction);
  const refreshPayT = useAppSelector(
    (state) => state.db.refreshPayTransactions
  );
  const dispatch = useAppDispatch();

  useEffect(() => {
    MyServerApi.getAll(SERVER_API_ENDPOINTS.getPayments)
      .then((data) => {
        console.log("data:", data);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }, [refreshPayT]);

  return {
    payTransactions,
    refreshTransactions: () => {
      dispatch(setRefreshPayTransactions(null));
    },
  };
};
