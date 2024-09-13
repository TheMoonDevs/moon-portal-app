import { WorkLogs } from "@prisma/client";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface StatsState {
  productiveStreakData: WorkLogs[];
  isShowProductiveStreak: boolean;
}

const initialState: StatsState = {
  productiveStreakData: [],
  isShowProductiveStreak: false,
};

export const statsActionSlice = createSlice({
  name: "statsActionSlice",
  initialState,
  reducers: {
    setProductiveStreakData: (state, action: PayloadAction<WorkLogs[]>) => {
      state.productiveStreakData = action.payload;
    },
    setIsShowProductiveStreak: (state, action: PayloadAction<boolean>) => {
      state.isShowProductiveStreak = action.payload;
    },
  },
});

export const { setProductiveStreakData, setIsShowProductiveStreak } = statsActionSlice.actions;
export default statsActionSlice.reducer;
