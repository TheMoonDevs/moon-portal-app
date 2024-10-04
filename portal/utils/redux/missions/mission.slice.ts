import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Mission } from "@prisma/client";

interface IMissionState {
  allMissions: Mission[] | null;
  activeMission: Mission | null;
  missionDetailsOpen: boolean;
  missionsLoading: boolean;
}

const initialState: IMissionState = {
  allMissions: null,
  activeMission: null,
  missionDetailsOpen: true,
  missionsLoading: false,
};

export const missionSlice = createSlice({
  name: "mission",
  initialState,
  reducers: {
    setActiveMission: (state, action: PayloadAction<Mission | null>) => {
      state.activeMission = action.payload;
    },
    setMissionDetailsOpen: (state, action: PayloadAction<boolean>) => {
      state.missionDetailsOpen = action.payload;
    },
    setAllMissions: (state, action: PayloadAction<Mission[] | null>) => {
      state.allMissions = action.payload;
    },
    setUpdateMission: (state, action: PayloadAction<Mission>) => {
      state.allMissions = state.allMissions
        ? state.allMissions?.map((mission) => {
            if (mission.id === action.payload.id) {
              return action.payload;
            }
            return mission;
          })
        : null;
    },
    setAddMission: (state, action: PayloadAction<Mission>) => {
      state.allMissions = state.allMissions
        ? [...state.allMissions, action.payload]
        : null;
    },

    setDeleteMission: (state, action: PayloadAction<Mission>) => {
      state.allMissions = state.allMissions
        ? state.allMissions?.filter(
            (mission) => mission.id !== action.payload.id
          )
        : null;
    },
    setMissionsLoading: (state, action: PayloadAction<boolean>) => {
      state.missionsLoading = action.payload;
    },
  },
});

export const {
  setActiveMission,
  setMissionDetailsOpen,
  setAllMissions,
  setMissionsLoading,
  setUpdateMission,
  setAddMission,
  setDeleteMission,
} = missionSlice.actions;

export default missionSlice.reducer;
