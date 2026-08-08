import type { User } from '@db/client';
import { createSlice } from '@reduxjs/toolkit';

import { LOCAL_STORAGE } from '@/utils/constants/appInfo';

const VERIFIED_EMAIL_KEY = 'verifiedUserEmail';

// The cached profile is a render-speed optimisation only. It is never treated
// as proof of a session — useUser discards it unless NextAuth agrees.
const readCachedUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(LOCAL_STORAGE.user);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as User;
    return parsed?.id ? parsed : null;
  } catch {
    localStorage.removeItem(LOCAL_STORAGE.user);
    return null;
  }
};

const readVerifiedEmail = (): string | null =>
  typeof window === 'undefined'
    ? null
    : localStorage.getItem(VERIFIED_EMAIL_KEY);

export const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: readCachedUser(),
    verifiedUserEmail: readVerifiedEmail(),
  },
  reducers: {
    setReduxUser: (state, action: { payload: User | null }) => {
      state.user = action.payload ?? null;
      if (typeof window === 'undefined') return;
      if (action.payload?.id) {
        localStorage.setItem(
          LOCAL_STORAGE.user,
          JSON.stringify(action.payload),
        );
      } else {
        localStorage.removeItem(LOCAL_STORAGE.user);
      }
    },
    clearReduxUser: (state) => {
      state.user = null;
      state.verifiedUserEmail = null;
      if (typeof window === 'undefined') return;
      localStorage.removeItem(LOCAL_STORAGE.user);
      localStorage.removeItem(VERIFIED_EMAIL_KEY);
    },
    setGoogleVerificationEmail: (state, action: { payload: string }) => {
      state.verifiedUserEmail = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem(VERIFIED_EMAIL_KEY, action.payload);
      }
    },
  },
});

export const { setReduxUser, clearReduxUser, setGoogleVerificationEmail } =
  authSlice.actions;

export default authSlice.reducer;
