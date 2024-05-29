import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface BalancesState {
  balance: number;
  totalEarned: string;
}

const initialState: BalancesState = {
  balance: 0,
  totalEarned: "0",
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
  },
});

export const { setBalance, setTotalEarned } = balancesSlice.actions;
export default balancesSlice.reducer;
