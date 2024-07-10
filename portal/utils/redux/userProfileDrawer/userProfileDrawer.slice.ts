import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@prisma/client';

interface UserProfileState {
  isDrawerOpen: boolean;
  selectedUser: User | null;
}

const initialState: UserProfileState = {
  isDrawerOpen: false,
  selectedUser: null,
};

export const userProfileDrawerSlice = createSlice({
  name: 'userProfileDrawer',
  initialState,
  reducers: {
    openSlideIn: (state, action: PayloadAction<User>) => {
      state.isDrawerOpen = true;
      state.selectedUser = action.payload;
    },
    closeSlideIn: (state) => {
      state.isDrawerOpen = false;
      state.selectedUser = null;
    },
    updateSelectedUser: (state, action: PayloadAction<User>) => {
      state.selectedUser = action.payload;
    }
  },
});

export const { openSlideIn, closeSlideIn, updateSelectedUser } = userProfileDrawerSlice.actions;

export default userProfileDrawerSlice.reducer;