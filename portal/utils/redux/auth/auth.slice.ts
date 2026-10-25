import type { User } from '@db/client';
import { createSlice } from '@reduxjs/toolkit';

import { LOCAL_STORAGE } from '@/utils/constants/appInfo';

// Left over from the old client-side Google check; cleared on sign-out.
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

export const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: readCachedUser(),
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
      if (typeof window === 'undefined') return;
      localStorage.removeItem(LOCAL_STORAGE.user);
      localStorage.removeItem(VERIFIED_EMAIL_KEY);
    },
  },
});

export const { setReduxUser, clearReduxUser } = authSlice.actions;

export default authSlice.reducer;
