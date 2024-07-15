import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@prisma/client';

interface CoreTeamState {
  members: User[];
  selectedMember: User | null;
  isDrawerOpen: boolean;
}

const initialState: CoreTeamState = {
  members: [],
  selectedMember: null,
  isDrawerOpen: false,
};

export const coreTeamSlice = createSlice({
  name: 'coreTeam',
  initialState,
  reducers: {
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

  },
});

export const {
  setMembers,
  selectMember,
  openDrawer,
  updateMember,
  closeDrawer,
} = coreTeamSlice.actions;

export default coreTeamSlice.reducer;