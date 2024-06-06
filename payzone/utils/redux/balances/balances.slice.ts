import { ExchangeConfigData } from "@/prisma/extraDbTypes";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface BalancesState {
  balance: number;
  totalEarned: string;
  exchange: {
    exchangeData: ExchangeConfigData;
    exchangeCurrency: any;
  } | null;
}

const initialState: BalancesState = {
  balance: 0,
  totalEarned: "0",
  exchange: null,
};

const balancesSlice = createSlice({
  name: "header",
  initialState,
  reducers: {
    setBalance: (state, action: PayloadAction<number>) => {
      state.balance = action.payload;
    },
    setTotalEarned: (state, action: PayloadAction<string>) => {
      state.totalEarned = action.payload;
    },
    setExchange: (
      state,
      action: PayloadAction<{
        exchangeData: ExchangeConfigData;
        exchangeCurrency: any;
      } | null>
    ) => {
      state.exchange = action.payload;
    },
  },
});

export const { setBalance, setTotalEarned, setExchange } =
  balancesSlice.actions;
export default balancesSlice.reducer;
