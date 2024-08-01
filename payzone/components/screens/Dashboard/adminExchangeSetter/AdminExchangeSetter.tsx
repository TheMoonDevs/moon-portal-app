"use client";

import { copyUPI } from "@/utils/constants/appInfo";
import { MyServerApi, SERVER_API_ENDPOINTS } from "@/utils/service/MyServerApi";
import { Button, Input, Modal, TextField } from "@mui/material";
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
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import CurrencySelectPopover from "@/components/global/CurrencySelectPopover";
import {
  updateSelectedCurrency,
  updateSelectedCurrencyValue,
} from "@/utils/redux/balances/balances.slice";
import { Toaster, toast } from "sonner";

export const AdminExchangeSetter = () => {
  const {
    multiplicationFactor,
    selectedCurrency: currency,
    exchange,
  } = useSyncBalances();

  const [exchangeRateUpdating, setExchangeRateUpdating] =
    useState<boolean>(false);
  const [liquidityINR, setLiquidityINR] = useState<number | null>();
  const [liquidityTMDCredits, setLiquidityTMDCredits] = useState<
    number | null
  >();
  const [creditsRateINR, setCreditsRateINR] = useState<number | null>();
  // const [toast, setToast] = useState<{
  //   open: boolean;
  //   message: string;
  //   severity: toastSeverity;
  // }>({
  //   open: false,
  //   message: "",
  //   severity: "success",
  // });
  const dispatch = useAppDispatch();

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  const handleCurrencySelect = (currency: string, value: number) => {
    dispatch(updateSelectedCurrency(currency));
    dispatch(updateSelectedCurrencyValue(value));
    handlePopoverClose();
  };

  useEffect(() => {
    if (exchange?.exchangeData) {
      setCreditsRateINR(exchange.exchangeData.creditsRateINR);
      setLiquidityINR(exchange.exchangeData.liquidityINR);
      setLiquidityTMDCredits(exchange.exchangeData.liquidityTMDCredits);

      setExchangeRateUpdating(false);
    }
  }, [exchange]);

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
        // setToast({
        //   message: "Exchange rate updated successfully",
        //   severity: "success",
        //   open: true,
        // });
        toast.success("Exchange rate updated successfully");

        setExchangeRateUpdating(false);
        setLiquidityINR(null);
        setLiquidityTMDCredits(null);
        setCreditsRateINR(null);
      })
      .catch((error) => {
        console.error("Error updating data:", error);
        // setToast({
        //   message: "Error updating exchange rate",
        //   severity: "error",
        //   open: true,
        // });
        toast.error("Error updating exchange rate");
        setExchangeRateUpdating(false);
        setLiquidityINR(null);
        setLiquidityTMDCredits(null);
        setCreditsRateINR(null);
      });
  };

  const handleClose = (event: any, reason: any) => {
    if (reason === "clickaway") {
      return;
    }
    // setToast((prevToast) => ({ ...prevToast, open: false }));
    toast.dismiss();
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <h4 className="text-md">Set TMD Exchange Info</h4>
      <div className="bg-whiteSmoke flex flex-col p-4 justify-between gap-4">
        <span className="flex justify-between">
          <p className="text-sm font-thin">Current Price</p>
          {exchange ? (
            <Button
              className="text-sm font-black text-black border border-neutral-500 px-2 py-1 rounded flex justify-center items-center"
              variant="outlined"
              aria-describedby={id}
              onClick={handleClick}
            >
              1 TMD === {multiplicationFactor} {currency}
              <span className="material-symbols-outlined">arrow_drop_down</span>
            </Button>
          ) : (
            <p className="text-sm text-black">loading...</p>
          )}
        </span>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleUpdateExchangeRate();
          }}
        >
          <div className="flex flex-col gap-2">
            <TextField
              label="Liquidity in INR"
              type="number"
              inputProps={{
                className: "w-full h-10 p-2  text-black",
              }}
              className="border border-midGrey"
              color="info"
              variant="outlined"
              placeholder="Enter Liquidity in INR"
              value={liquidityINR || ""}
              aria-label="Liquidity in INR"
              onChange={(e) => setLiquidityINR(Number(e.target.value))}
              disabled={exchangeRateUpdating}
            />
            <TextField
              label="Liquidity in TMD"
              type="number"
              inputProps={{
                className: "w-full h-10 p-2  text-black",
              }}
              className="border border-midGrey"
              color="info"
              variant="outlined"
              required={true}
              placeholder="Enter Liquidity TMD Credits ***"
              value={liquidityTMDCredits || ""}
              onChange={(e) => setLiquidityTMDCredits(Number(e.target.value))}
              disabled={exchangeRateUpdating}
            />
            <TextField
              label="Exchange Rate in INR"
              type="number"
              inputProps={{
                className: "w-full h-10 p-2  text-black",
              }}
              className="border border-midGrey"
              color="info"
              variant="outlined"
              required={true}
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
      <CurrencySelectPopover
        popoverProps={{ id, open, anchorEl, onClose: handlePopoverClose }}
        handleCurrencySelect={handleCurrencySelect}
      />
      {/* <Toast
        open={toast.open}
        handleClose={handleClose}
        message={toast.message}
        severity={toast.severity}
      /> */}
    </div>
  );
};
