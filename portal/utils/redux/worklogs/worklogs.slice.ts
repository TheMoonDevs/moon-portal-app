import { User, WorkLogs, ZeroRecords } from "@prisma/client";
import { createSlice } from "@reduxjs/toolkit";

export const worklogsSlice = createSlice({
  name: "worklogs",
  initialState: {
    isEditorSaving: false,
    logsList: [] as WorkLogs[],
  },
  reducers: {
    setEdiotrSaving: (state, action) => {
      state.isEditorSaving = action.payload;
    },
    setLogsList: (state, action) => {
      state.logsList = action.payload;
    },
    updateLogs: (state, action) => {
      state.logsList = state.logsList.map((log) => {
        if (log.id === action.payload.id) {
          return action.payload;
        }
        if (log.date === action.payload.date) {
          return action.payload;
        }
        return log;
      });
    },
  },
});

export const { setEdiotrSaving, setLogsList, updateLogs } =
  worklogsSlice.actions;

export default worklogsSlice.reducer;
