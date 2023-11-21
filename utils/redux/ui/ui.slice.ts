import { createSlice } from "@reduxjs/toolkit";

export const uiSlice = createSlice({
  name: "ui",
  initialState: {
    isSidebarOpen: false,
    isLoading: false,
    globalToast: false,
  },
  reducers: {
    setIsSidebarOpen: (state, action) => {
      state.isSidebarOpen = action.payload;
    },
    setGlobalToast: (state, action) => {
      state.globalToast = action.payload;
    }
  },
  extraReducers: (builder) => {},
});

const { actions, reducer } = uiSlice;

// Only Slice Actions are generated here, refer sharedActions for others.
export const {
  setGlobalToast,
  setIsSidebarOpen,
} = actions;

export default reducer;
