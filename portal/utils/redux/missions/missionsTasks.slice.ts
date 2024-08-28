import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MissionTask } from '@prisma/client';

interface MissionsTasksState {
  tasks: MissionTask[];
}

const initialState: MissionsTasksState = {
  tasks: [],
};

export const missionsTasksSlice = createSlice({
  name: 'missionTasks',
  initialState,
  reducers: {
    setAllTasks: (state, action: PayloadAction<MissionTask[]>) => {
      state.tasks.push(...action.payload);
    },
  },
});


export const { setAllTasks } = missionsTasksSlice.actions;

export default missionsTasksSlice.reducer;
