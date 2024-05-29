import { createSlice } from "@reduxjs/toolkit";

export const uiSlice = createSlice({
  name: "ui",
  initialState: {
    isSidebarOpen: false,
    isLoading: false,
    error: {
      isError: false,
      description: "",
    },
    success: false,
    globalToast: false,
    toasts: [] as any[],
    jobPostsRefresh: false,
  },
  reducers: {
    setJobPostsRefresh: (state, action) => {
      state.jobPostsRefresh = !state.jobPostsRefresh;
    },
    pushToast: (state, action) => {
      state.toasts.push(action.payload);
    },
    popToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    setIsSidebarOpen: (state, action) => {
      state.isSidebarOpen = action.payload;
    },
    setGlobalToast: (state, action) => {
      state.globalToast = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setSuccess: (state, action) => {
      state.success = action.payload;
    },
  },
  extraReducers: (builder) => {},
});

const { actions, reducer } = uiSlice;

// Only Slice Actions are generated here, refer sharedActions for others.
export const {
  setGlobalToast,
  setIsSidebarOpen,
  pushToast,
  popToast,
  setJobPostsRefresh,
  setLoading,
  setError,
  setSuccess,
} = actions;

export default reducer;
