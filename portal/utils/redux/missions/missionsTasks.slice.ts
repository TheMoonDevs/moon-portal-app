import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MissionTask } from '@prisma/client';

interface MissionsTasksState {
  tasks: MissionTask[];
  tasksLoading: boolean
}

const initialState: MissionsTasksState = {
  tasks: [],
  tasksLoading: false
};

export const missionsTasksSlice = createSlice({
  name: 'missionTasks',
  initialState,
  reducers: {
    setAllTasks: (state, action: PayloadAction<MissionTask[]>) => {
      state.tasks.push(...action.payload);
    },
    setTasksLoading: (state, action: PayloadAction<boolean>) => {
      state.tasksLoading = action.payload
    }
  },
});


export const { setAllTasks, setTasksLoading } = missionsTasksSlice.actions;

export default missionsTasksSlice.reducer;
