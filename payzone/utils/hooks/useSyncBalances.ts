import useReadContract from "@/utils/hooks/useReadContract";
import { useAppDispatch, useAppSelector } from "../redux/store";
import { useAuthSession } from "./useAuthSession";
import { TOKEN_INFO } from "../constants/appInfo";
import { useEffect } from "react";
import { Address } from "viem";
import TMDTokenABI from "@/utils/constants/erc20.json";
import { setBalance, setTotalEarned } from "../redux/balances/balances.slice";
import { formatNumberToText } from "../helpers/prettyprints";

// DO NOT PASS INIT true more than once in the entire repo.
export const useSyncBalances = (init?: boolean) => {
  const { user } = useAuthSession();
  const dispatch = useAppDispatch();
  const { exchange } = useAppSelector((state) => state.balances);
  const { selectedCurrency, selectedCurrencyValue, balance } = useAppSelector(
    (state) => state.balances
  );

  const tokenData = useReadContract({
    address: TOKEN_INFO.contractAddress as Address,
    abi: TMDTokenABI,
    chain: TOKEN_INFO.chainId,
  });

  useEffect(() => {
    if (!init) return;
    const formattedBalance = Number(tokenData?.balance) / 10 ** 18;
    console.log("balance", formattedBalance);
    dispatch(setBalance(formattedBalance));
  }, [tokenData, dispatch, init]);

  useEffect(() => {
    const formattedTotalEarned =
      formatNumberToText(
        "0"
        // payTransactions?.filter((payTransaction: any)=> payTransaction.txStatus !== "PENDING").reduce(
        //   (total: number, transaction: any) => total + transaction.amount,
        //   0
        //
        // )
      ) || "0";
    dispatch(setTotalEarned(formattedTotalEarned));
  }, [dispatch]);

  let multiplicationFactor = 0;
  if (selectedCurrency === "INR") {
    multiplicationFactor = exchange?.exchangeData.creditsRateINR || 0;
  } else if (
    exchange?.exchangeCurrency.INR !== 0 &&
    exchange?.exchangeData.creditsRateINR !== null &&
    exchange?.exchangeData.creditsRateINR !== undefined
  ) {
    multiplicationFactor = parseFloat(
      (
        (exchange.exchangeData.creditsRateINR * selectedCurrencyValue) /
        exchange.exchangeCurrency.INR
      ).toFixed(2)
    );
  }

  return {
    balance,
    tokenData,
    exchange,
    liquidityTMDCredits: exchange?.exchangeData.liquidityTMDCredits,
    multiplicationFactor,
    selectedCurrency,
  };
};
