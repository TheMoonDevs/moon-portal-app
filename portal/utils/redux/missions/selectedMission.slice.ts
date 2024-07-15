import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Mission } from '@prisma/client';

interface SelectedMissionState {
  mission: Mission | null;
  isOpen: boolean;
}

const initialState: SelectedMissionState = {
  mission: null,
  isOpen: false,
};

export const selectedMissionSlice = createSlice({
  name: 'selectedMission',
  initialState,
  reducers: {
    setSelectedMission: (state, action: PayloadAction<Mission | null>) => {
      state.mission = action.payload;
      state.isOpen = action.payload !== null;
    },
    setMissionDetailsOpen: (state, action: PayloadAction<boolean>) => {
        state.isOpen = action.payload;
      },
  },
});

export const { setSelectedMission, setMissionDetailsOpen } = selectedMissionSlice.actions;

export default selectedMissionSlice.reducer;