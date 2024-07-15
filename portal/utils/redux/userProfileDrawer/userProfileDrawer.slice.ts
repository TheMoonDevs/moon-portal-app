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
    }
  },
});

export const { openSlideIn, closeSlideIn } = userProfileDrawerSlice.actions;

export default userProfileDrawerSlice.reducer;