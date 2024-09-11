import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Mission, MissionTask } from '@prisma/client';

interface MissionTaskEditorState {
  editingMission: Mission | null;
  editingTask: MissionTask | null;
  isEditorModalOpen: boolean;
  activeTab: string;
}

const initialState: MissionTaskEditorState = {
  editingMission: null,
  editingTask: null,
  isEditorModalOpen: false,
  activeTab: 'missions',
};

export const missionTaskEditorSlice = createSlice({
  name: 'missionTaskEditor',
  initialState,
  reducers: {
    setEditingMission: (state, action: PayloadAction<Mission | null>) => {
      state.editingMission = action.payload;
    },
    setEditingTask: (state, action: PayloadAction<MissionTask | null>) => {
      state.editingTask = action.payload;
    },
    setEditorModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isEditorModalOpen = action.payload;
    },
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload
    },
    clearEditorState: (state) => {
      state.editingMission = null;
      state.editingTask = null;
      state.isEditorModalOpen = false;
    },
  },
});

export const {
  setEditingMission,
  setEditingTask,
  setEditorModalOpen,
  setActiveTab,
  clearEditorState,
} = missionTaskEditorSlice.actions;

export default missionTaskEditorSlice.reducer;
