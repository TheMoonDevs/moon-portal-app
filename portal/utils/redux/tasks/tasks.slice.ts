import { Task } from "@prisma/client";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface TasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: TasksState = {
  tasks: [] as Task[],
  loading: false,
  error: null,
  lastFetched: null,
};

const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    fetchTasksStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchTasksSuccess(state, action: PayloadAction<Task[]>) {
      state.tasks = action.payload;
      state.loading = false;
      state.lastFetched = Date.now();
    },
    fetchTasksFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const { fetchTasksStart, fetchTasksSuccess, fetchTasksFailure } =
  tasksSlice.actions;
export default tasksSlice.reducer;
