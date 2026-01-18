import { createSlice } from "@reduxjs/toolkit";

interface AdminTasksState {
  incompleteTasks: number;
  completedTasks: number;
  adminTasksMarkdown: string;
}

const initialState: AdminTasksState = {
  incompleteTasks: 0,
  completedTasks: 0,
  adminTasksMarkdown: "*",
};

export const adminTasksSlice = createSlice({
  name: "adminTasks",
  initialState,
  reducers: {
    setIncompleteTasks: (state, action) => {
      state.incompleteTasks = action.payload;
    },
    setCompletedTasks: (state, action) => {
      state.completedTasks = action.payload;
    },
    setAdminTasksMarkdown: (state, action) => {
      state.adminTasksMarkdown = action.payload;
    },
  },
});

export const { setIncompleteTasks, setCompletedTasks, setAdminTasksMarkdown } =
  adminTasksSlice.actions;

export default adminTasksSlice.reducer;
