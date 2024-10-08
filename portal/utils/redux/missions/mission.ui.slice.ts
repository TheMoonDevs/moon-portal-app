import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Mission, MissionTask } from "@prisma/client";

interface IMissionUiState {
  isEditModalOpen: boolean;
  activeTab: string;
  editingMission: Mission | null;
  editingTask: MissionTask | null;
}

const initialState: IMissionUiState = {
  isEditModalOpen: false,
  activeTab: "missions",
  editingMission: null,
  editingTask: null,
};

export const missionUi = createSlice({
  name: "missionUi",
  initialState,
  reducers: {
    setEditModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isEditModalOpen = action.payload;
    },
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload;
    },
    setEditingMission: (state, action: PayloadAction<Mission | null>) => {
      state.editingMission = action.payload;
    },
    setEditingTask: (state, action: PayloadAction<MissionTask | null>) => {
      state.editingTask = action.payload;
    },
    clearEditorState: (state) => {
      state.editingMission = null;
      state.editingTask = null;
      state.isEditModalOpen = false;
    },
  },
});

export const {
  setEditModalOpen,
  setActiveTab,
  clearEditorState,
  setEditingMission,
  setEditingTask,
} = missionUi.actions;

export default missionUi.reducer;
