import { LOCAL_STORAGE } from '@/utils/constants/appInfo';
import { User } from '@prisma/client';
import { createSlice } from '@reduxjs/toolkit';
import { redirect } from 'next/dist/server/api-utils';

export const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    user: null as User | null,
    verifiedUserEmail:
      typeof window !== 'undefined'
        ? localStorage.getItem('verifiedUserEmail')
        : null,
    redirectUri: null,
  },
  reducers: {
    setReduxUser: (state, action) => {
      state.user = action.payload;
      localStorage.setItem(LOCAL_STORAGE.user, JSON.stringify(action.payload));
    },
    setGoogleVerificationEmail: (state, action) => {
      if (typeof window !== 'undefined')
        localStorage.setItem('verifiedUserEmail', action.payload);
      state.verifiedUserEmail = action.payload;
    },
  },
});

const { actions, reducer } = uiSlice;

// Only Slice Actions are generated here, refer sharedActions for others.
export const { setReduxUser, setGoogleVerificationEmail } = actions;

export default reducer;
