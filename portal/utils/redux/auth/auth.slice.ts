import { LOCAL_STORAGE } from '@/utils/constants/appInfo';
import { User } from '@db/client';
import { createSlice } from '@reduxjs/toolkit';

const getInitialUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const rawUser = localStorage.getItem(LOCAL_STORAGE.user);
  if (!rawUser) return null;
  try {
    const parsed = JSON.parse(rawUser) as User;
    return parsed?.id ? parsed : null;
  } catch (error) {
    console.log('Invalid auth user in localStorage, clearing it', error);
    localStorage.removeItem(LOCAL_STORAGE.user);
    return null;
  }
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    user: getInitialUser(),
    verifiedUserEmail:
      typeof window !== 'undefined'
        ? localStorage.getItem('verifiedUserEmail')
        : null,
    redirectUri: null,
  },
  reducers: {
    setRedirectUri: (state, action) => {
      state.redirectUri = action.payload;
    },

    setReduxUser: (state, action) => {
      state.user = action.payload ?? null;
      if (action.payload?.id) {
        localStorage.setItem(LOCAL_STORAGE.user, JSON.stringify(action.payload));
      }
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
export const { setReduxUser, setGoogleVerificationEmail, setRedirectUri } =
  actions;

export default reducer;
