import { ExchangeConfigData } from "@/prisma/extraDbTypes";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface BalancesState {
  balance: number;
  totalEarned: string;
  exchange: {
    exchangeData: ExchangeConfigData;
    exchangeCurrency: any;
  } | null;
  selectedCurrency: string;
  selectedCurrencyValue: number;
}

const initialState: BalancesState = {
  balance: 0,
  totalEarned: "0",
  exchange: null,
  selectedCurrency: '',
  selectedCurrencyValue: 0,
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
    setReduxSelectedCurrency: (state, action: PayloadAction<string>) => {
      state.selectedCurrency = action.payload;
    },
    setReduxSelectedCurrencyValue: (state, action: PayloadAction<number>) => {
      state.selectedCurrencyValue = action.payload;
    },
  },
});

export const { setBalance, setTotalEarned, setExchange, setReduxSelectedCurrency, setReduxSelectedCurrencyValue } =
  balancesSlice.actions;
export default balancesSlice.reducer;
