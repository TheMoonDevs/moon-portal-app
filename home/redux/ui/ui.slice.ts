import { createSlice } from "@reduxjs/toolkit";

export const uiSlice = createSlice({
  name: "ui",
  initialState: {
    isPageLoading: false,
    isSidebarOpen: false,
    isLoading: false,
    globalToast: false,
  },
  reducers: {
    setIsPageLoading: (state, action) => {
      state.isPageLoading = action.payload;
    },
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
  setIsPageLoading,
  setGlobalToast,
  setIsSidebarOpen,
} = actions;

export default reducer;
