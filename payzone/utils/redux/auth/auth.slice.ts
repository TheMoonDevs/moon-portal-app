import { User } from "@prisma/client";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  loading: boolean;
  accessToken: string | null;
  refreshToken?: null;
  user?: User | null;
  refUser?: User | null;
  authType: "referral" | "payzone" | null;
  address: string;
}

const initialState: AuthState = {
  loading: false,
  accessToken: null,
  refreshToken: null,
  user: null,
  refUser: null,
  authType: null,
  address: "",
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setToken: (state, action) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    clearToken: (state) => {
      state.accessToken = null;
      state.refreshToken = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setRefUser: (state, action) => {
      state.refUser = action.payload;
    },
    setAuthType: (
      state,
      action: PayloadAction<typeof initialState.authType>
    ) => {
      state.authType = action.payload;
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    updateWalletAddress: (state, action: PayloadAction<string>) => {
      state.address = action.payload;
    },
  },
});

export const {
  setAuthLoading,
  setToken,
  clearToken,
  setUser,
  setRefUser,
  setAuthType,
  updateWalletAddress,
} = authSlice.actions;

export default authSlice.reducer;
