import { WorkLogs } from "@prisma/client";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface MissedTask {
  title: string;
  content: string;
  date: string;
}

interface StatsState {
  productiveStreakData: WorkLogs[];
  isShowProductiveStreak: boolean;
  showMissedLogs: boolean;
  missedDates: string[];
  showUpdatedLogs: boolean;
  updatedLogsDates: string[];
  showMissedTasks: boolean;
  missedTasksData: MissedTask[];
  showCompletedTasks: boolean;
  completedTasksData: MissedTask[]
}

const initialState: StatsState = {
  productiveStreakData: [],
  isShowProductiveStreak: false,
  showMissedLogs: false,
  missedDates: [],
  showUpdatedLogs: false,
  updatedLogsDates: [],
  showMissedTasks: false,
  missedTasksData: [],
  showCompletedTasks: false,
  completedTasksData: []
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
    setShowMissedLogs: (state, action: PayloadAction<boolean>) => {
      state.showMissedLogs = action.payload;
    },
    setMissedDates: (state, action: PayloadAction<string[]>) => {
      state.missedDates = action.payload;
    },
    setShowUpdatedLogs: (state, action: PayloadAction<boolean>) => {
      state.showUpdatedLogs = action.payload;
    },
    setUpdatedLogsDates: (state, action: PayloadAction<string[]>) => {
      state.updatedLogsDates = action.payload;
    },
    setShowMissedTasks: (state, action: PayloadAction<boolean>) => {
      state.showMissedTasks = action.payload;
    },
    setMissedTasksData: (state, action: PayloadAction<MissedTask[]>) => {
      state.missedTasksData = action.payload;
    },
    setShowCompletedTasks: (state, action: PayloadAction<boolean>) => {
      state.showCompletedTasks = action.payload;
    },
    setCompletedTasksData: (state, action: PayloadAction<MissedTask[]>) => {
      state.completedTasksData = action.payload;
    },
  },
});

export const { setProductiveStreakData, setIsShowProductiveStreak, setShowMissedLogs, setMissedDates, setShowUpdatedLogs, setUpdatedLogsDates, setShowMissedTasks, setMissedTasksData, setShowCompletedTasks, setCompletedTasksData } = statsActionSlice.actions;
export default statsActionSlice.reducer;
