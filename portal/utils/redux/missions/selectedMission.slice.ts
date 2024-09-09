import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Mission } from '@prisma/client';

interface SelectedMissionState {
  mission: Mission | null;
  missions: Mission[] | null
  isOpen: boolean;
}

const initialState: SelectedMissionState = {
  mission: null,
  isOpen: true,
  missions: null
};

export const selectedMissionSlice = createSlice({
  name: 'selectedMission',
  initialState,
  reducers: {
    setSelectedMission: (state, action: PayloadAction<Mission | null>) => {
      state.mission = action.payload;
    },
    setMissionDetailsOpen: (state, action: PayloadAction<boolean>) => {
        state.isOpen = action.payload;
    },
    setAllMissions:(state,action: PayloadAction<Mission[] | null>) =>{
      state.missions = action.payload
    }
  },
});

export const { setSelectedMission, setMissionDetailsOpen,setAllMissions } = selectedMissionSlice.actions;

export default selectedMissionSlice.reducer;