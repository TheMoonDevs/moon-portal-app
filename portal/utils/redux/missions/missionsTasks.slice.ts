import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MissionTask } from "@prisma/client";

interface MissionsTasksState {
  allTasks: MissionTask[];
  activeTask: MissionTask | null;

  tasksLoading: boolean;
}

const initialState: MissionsTasksState = {
  allTasks: [],
  activeTask: null,
  tasksLoading: false,
};

export const missionsTasksSlice = createSlice({
  name: "missionTasks",
  initialState,
  reducers: {
    setActiveTask: (state, action: PayloadAction<MissionTask | null>) => {
      state.activeTask = action.payload;
    },
    setAllTasks: (state, action: PayloadAction<MissionTask[]>) => {
      state.allTasks.push(...action.payload);
    },

    updateTask: (state, action: PayloadAction<MissionTask>) => {
      const index = state.allTasks.findIndex(
        (task) => task.id === action.payload.id
      );
      if (index !== -1) {
        state.allTasks[index] = action.payload;
      }
    },

    deleteTask: (state, action: PayloadAction<MissionTask>) => {
      state.allTasks = state.allTasks.filter(
        (task) => task.id !== action.payload.id
      );
    },

    setTasksLoading: (state, action: PayloadAction<boolean>) => {
      state.tasksLoading = action.payload;
    },
  },
});

export const {
  setAllTasks,
  setActiveTask,
  setTasksLoading,
  updateTask,
  deleteTask,
} = missionsTasksSlice.actions;

export default missionsTasksSlice.reducer;
