import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@prisma/client';

interface CoreTeamState {
  members: User[];
  coreTeamMembers: User[];
  trialCandidates: User[];
  selectedMember: User | null;
  isDrawerOpen: boolean;
  isEditModalOpen: boolean;
}

const initialState: CoreTeamState = {
  members: [],
  coreTeamMembers: [],
  trialCandidates: [],
  selectedMember: null,
  isDrawerOpen: false,
  isEditModalOpen: false,
};

export const coreTeamSlice = createSlice({
  name: 'coreTeam',
  initialState,
  reducers: {
    setCoreTeamMembers: (state, action: PayloadAction<User[]>) => {
      state.coreTeamMembers = action.payload;
    },
    setTrialCandidates: (state, action: PayloadAction<User[]>) => {
      state.trialCandidates = action.payload;
    },
    setMembers: (state, action: PayloadAction<User[]>) => {
      state.members = action.payload;
    },
    selectMember: (state, action: PayloadAction<User>) => {
      state.selectedMember = action.payload;
      state.isDrawerOpen = true;
    },
    updateMember: (state, action: PayloadAction<User>) => {
      const index = state.members.findIndex(user => user.id === action.payload.id);
      if (index !== -1) {
        state.selectedMember = action.payload;
        state.members[index] = action.payload;
      }
    },
    openDrawer: (state) => {
      state.isDrawerOpen = true;
    },
    closeDrawer: (state) => {
      state.isDrawerOpen = false;
    },
    setEditModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isEditModalOpen = action.payload;
    }
  },
});

export const {
  setCoreTeamMembers,
  setTrialCandidates,
  setMembers,
  selectMember,
  openDrawer,
  updateMember,
  closeDrawer,
  setEditModalOpen
} = coreTeamSlice.actions;

export default coreTeamSlice.reducer;
